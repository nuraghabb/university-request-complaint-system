import "server-only";

import type {
  NotificationType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { deliverEmail } from "@/services/email-delivery";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = 5;

/*
 * İşlem sırasında uygulama kapanırsa PROCESSING durumunda
 * kalan kayıtlar bu sürenin ardından tekrar PENDING yapılır.
 */
const PROCESSING_TIMEOUT_MINUTES = 15;

interface ProcessNotificationOutboxOptions {
  batchSize?: number;
}

export interface NotificationOutboxProcessResult {
  selected: number;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  recovered: number;
}

interface BuiltEmailContent {
  text: string;
  html?: string;
}

interface NotificationPayload {
  applicantName?: unknown;
  trackingCode?: unknown;
  status?: unknown;
  text?: unknown;
  html?: unknown;
}

function normalizeBatchSize(
  batchSize?: number
): number {
  if (batchSize === undefined) {
    return DEFAULT_BATCH_SIZE;
  }

  if (!Number.isInteger(batchSize)) {
    throw new Error(
      "Bildirim kuyruğu işlem limiti tam sayı olmalıdır."
    );
  }

  return Math.min(
    Math.max(batchSize, 1),
    MAX_BATCH_SIZE
  );
}

function isJsonObject(
  value: Prisma.JsonValue
): value is Prisma.JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readPayload(
  payload: Prisma.JsonValue
): NotificationPayload {
  if (!isJsonObject(payload)) {
    throw new Error(
      "Bildirim kuyruğu payload bilgisi geçersiz."
    );
  }

  return payload;
}

function requireString(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Bildirim payload alanı eksik: ${fieldName}.`
    );
  }

  return value.trim();
}

function buildEmailContent(
  type: NotificationType,
  payloadValue: Prisma.JsonValue
): BuiltEmailContent {
  const payload = readPayload(payloadValue);

  switch (type) {
    case "PETITION_RECEIVED": {
      const applicantName = requireString(
        payload.applicantName,
        "applicantName"
      );

      const trackingCode = requireString(
        payload.trackingCode,
        "trackingCode"
      );

      return {
        text: [
          `Sayın ${applicantName},`,
          "",
          "E-posta doğrulamanız tamamlandı ve başvurunuz kuruma iletildi.",
          "",
          `Başvuru takip kodunuz: ${trackingCode}`,
          "",
          "Takip kodunuzu güvenli bir yerde saklayın.",
        ].join("\n"),
      };
    }

    case "PETITION_ASSIGNED":
    case "PETITION_FORWARDED":
    case "PETITION_ANSWERED":
    case "PETITION_CLOSED":
    case "PETITION_REJECTED": {
      const text = requireString(
        payload.text,
        "text"
      );

      const html =
        typeof payload.html === "string" &&
        payload.html.trim()
          ? payload.html.trim()
          : undefined;

      return {
        text,
        html,
      };
    }

    case "EMAIL_VERIFICATION":
      throw new Error(
        "E-posta doğrulama bildirimi açık token içerdiği için genel kuyruk işlemcisiyle gönderilemez."
      );

    default:
      throw new Error(
        `Desteklenmeyen bildirim türü: ${type}.`
      );
  }
}

function calculateNextAvailableAt(
  attemptCount: number
): Date {
  const multiplier = Math.max(
    attemptCount,
    1
  );

  return new Date(
    Date.now() +
      RETRY_DELAY_MINUTES *
        multiplier *
        60 *
        1000
  );
}

function sanitizeErrorMessage(
  error: unknown
): string {
  const message =
    error instanceof Error
      ? error.message
      : "Bilinmeyen bildirim gönderim hatası.";

  return message.slice(0, 2000);
}

function createSuccessMetadata(input: {
  petitionId: number | null;
  notificationType: NotificationType;
  provider: string;
  providerMessageId?: string;
  attemptCount: number;
}): Prisma.InputJsonObject {
  return {
    petitionId: input.petitionId,
    notificationType: input.notificationType,
    provider: input.provider,
    attemptCount: input.attemptCount,
    ...(input.providerMessageId
      ? {
          providerMessageId:
            input.providerMessageId,
        }
      : {}),
  };
}

async function recoverStuckNotifications(): Promise<number> {
  const timeoutDate = new Date(
    Date.now() -
      PROCESSING_TIMEOUT_MINUTES *
        60 *
        1000
  );

  const recovered =
    await prisma.notificationOutbox.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: {
          lt: timeoutDate,
        },
        attemptCount: {
          lt: MAX_ATTEMPTS,
        },
      },
      data: {
        status: "PENDING",
        availableAt: new Date(),
        lastError:
          "Önceki işlem zaman aşımına uğradığı için bildirim yeniden kuyruğa alındı.",
      },
    });

  return recovered.count;
}

/**
 * NotificationOutbox tablosundaki bekleyen bildirimleri işler.
 *
 * Başarılı gönderim:
 * - status: SENT
 * - sentAt doldurulur
 *
 * Başarısız gönderim:
 * - Deneme hakkı varsa tekrar PENDING olur
 * - availableAt ileri alınır
 * - Maksimum denemeye ulaştıysa FAILED olur
 */
export async function processNotificationOutbox(
  options: ProcessNotificationOutboxOptions = {}
): Promise<NotificationOutboxProcessResult> {
  const batchSize = normalizeBatchSize(
    options.batchSize
  );

  const recovered =
    await recoverStuckNotifications();

  const now = new Date();

  const pendingNotifications =
    await prisma.notificationOutbox.findMany({
      where: {
        status: "PENDING",
        availableAt: {
          lte: now,
        },
        attemptCount: {
          lt: MAX_ATTEMPTS,
        },
      },
      select: {
        id: true,
        petitionId: true,
        type: true,
        recipientEmail: true,
        subject: true,
        payload: true,
        attemptCount: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: batchSize,
    });

  const result: NotificationOutboxProcessResult = {
    selected: pendingNotifications.length,
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    recovered,
  };

  for (const notification of pendingNotifications) {
    const claimedNotification =
      await prisma.notificationOutbox.updateMany({
        where: {
          id: notification.id,
          status: "PENDING",
          availableAt: {
            lte: now,
          },
        },
        data: {
          status: "PROCESSING",
        },
      });

    if (claimedNotification.count !== 1) {
      result.skipped += 1;
      continue;
    }

    result.processed += 1;

    const nextAttemptCount =
      notification.attemptCount + 1;

    try {
      const emailContent = buildEmailContent(
        notification.type,
        notification.payload
      );

      const deliveryResult = await deliverEmail({
        to: notification.recipientEmail,
        subject: notification.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      if (!deliveryResult.success) {
        const errorMessage =
          deliveryResult.error ||
          "E-posta gönderimi başarısız.";

        const reachedMaximumAttempts =
          nextAttemptCount >= MAX_ATTEMPTS;

        await prisma.$transaction([
          prisma.notificationOutbox.update({
            where: {
              id: notification.id,
            },
            data: {
              status: reachedMaximumAttempts
                ? "FAILED"
                : "PENDING",
              attemptCount: nextAttemptCount,
              lastError: errorMessage,
              availableAt:
                reachedMaximumAttempts
                  ? new Date()
                  : calculateNextAvailableAt(
                      nextAttemptCount
                    ),
            },
          }),

          prisma.auditLog.create({
            data: {
              actorType: "SYSTEM",
              action: "NOTIFY",
              entityType:
                "NOTIFICATION_OUTBOX",
              entityId: String(
                notification.id
              ),
              metadata: {
                petitionId:
                  notification.petitionId,
                notificationType:
                  notification.type,
                attemptCount:
                  nextAttemptCount,
                willRetry:
                  !reachedMaximumAttempts,
              },
              success: false,
              errorMessage,
            },
          }),
        ]);

        result.failed += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.notificationOutbox.update({
          where: {
            id: notification.id,
          },
          data: {
            status: "SENT",
            attemptCount: nextAttemptCount,
            lastError: null,
            sentAt: new Date(),
          },
        }),

        prisma.auditLog.create({
          data: {
            actorType: "SYSTEM",
            action: "NOTIFY",
            entityType:
              "NOTIFICATION_OUTBOX",
            entityId: String(
              notification.id
            ),
            metadata: createSuccessMetadata({
              petitionId:
                notification.petitionId,
              notificationType:
                notification.type,
              provider:
                deliveryResult.provider,
              providerMessageId:
                deliveryResult.providerMessageId,
              attemptCount:
                nextAttemptCount,
            }),
            success: true,
          },
        }),
      ]);

      result.sent += 1;
    } catch (error) {
      const errorMessage =
        sanitizeErrorMessage(error);

      const reachedMaximumAttempts =
        nextAttemptCount >= MAX_ATTEMPTS;

      await prisma.$transaction([
        prisma.notificationOutbox.update({
          where: {
            id: notification.id,
          },
          data: {
            status: reachedMaximumAttempts
              ? "FAILED"
              : "PENDING",
            attemptCount: nextAttemptCount,
            lastError: errorMessage,
            availableAt:
              reachedMaximumAttempts
                ? new Date()
                : calculateNextAvailableAt(
                    nextAttemptCount
                  ),
          },
        }),

        prisma.auditLog.create({
          data: {
            actorType: "SYSTEM",
            action: "NOTIFY",
            entityType:
              "NOTIFICATION_OUTBOX",
            entityId: String(
              notification.id
            ),
            metadata: {
              petitionId:
                notification.petitionId,
              notificationType:
                notification.type,
              attemptCount:
                nextAttemptCount,
              willRetry:
                !reachedMaximumAttempts,
            },
            success: false,
            errorMessage,
          },
        }),
      ]);

      result.failed += 1;
    }
  }

  return result;
}