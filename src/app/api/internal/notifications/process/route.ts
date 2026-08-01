import "server-only";

import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { processNotificationOutbox } from "@/services/notification-outbox-processor";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;

interface ProcessRequestBody {
  batchSize?: unknown;
}

function secureCompare(
  providedValue: string,
  expectedValue: string
): boolean {
  const providedBuffer = Buffer.from(providedValue);
  const expectedBuffer = Buffer.from(expectedValue);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    expectedBuffer
  );
}

function getBearerToken(
  request: NextRequest
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.trim().split(/\s+/, 2);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

function normalizeBatchSize(
  value: unknown
): number {
  if (value === undefined) {
    return DEFAULT_BATCH_SIZE;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new Error(
      "batchSize tam sayı olmalıdır."
    );
  }

  if (
    value < 1 ||
    value > MAX_BATCH_SIZE
  ) {
    throw new Error(
      `batchSize 1 ile ${MAX_BATCH_SIZE} arasında olmalıdır.`
    );
  }

  return value;
}

async function readRequestBody(
  request: NextRequest
): Promise<ProcessRequestBody> {
  const contentLength =
    request.headers.get("content-length");

  if (
    contentLength === null ||
    contentLength === "0"
  ) {
    return {};
  }

  try {
    const body = (await request.json()) as unknown;

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      throw new Error(
        "İstek gövdesi JSON nesnesi olmalıdır."
      );
    }

    return body as ProcessRequestBody;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Geçerli bir JSON gövdesi gönderilmelidir."
      );
    }

    throw error;
  }
}

/**
 * NotificationOutbox kuyruğunu güvenli biçimde işler.
 *
 * İstek örneği:
 *
 * POST /api/internal/notifications/process
 * Authorization: Bearer <NOTIFICATION_WORKER_SECRET>
 *
 * İsteğe bağlı JSON gövdesi:
 * {
 *   "batchSize": 10
 * }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const workerSecret =
    process.env.NOTIFICATION_WORKER_SECRET;

  if (!workerSecret) {
    console.error(
      "NOTIFICATION_WORKER_SECRET tanımlı değil."
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Bildirim kuyruğu servisi yapılandırılmamış.",
      },
      {
        status: 503,
      }
    );
  }

  const providedToken =
    getBearerToken(request);

  if (
    !providedToken ||
    !secureCompare(
      providedToken,
      workerSecret
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Yetkisiz istek.",
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": "Bearer",
        },
      }
    );
  }

  try {
    const body =
      await readRequestBody(request);

    const batchSize =
      normalizeBatchSize(body.batchSize);

    const result =
      await processNotificationOutbox({
        batchSize,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Bildirim kuyruğu işlendi.",
        result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Bildirim kuyruğu işlenemedi.";

    const isValidationError =
      message.includes("batchSize") ||
      message.includes("JSON") ||
      message.includes("gövdesi");

    if (!isValidationError) {
      console.error(
        "Bildirim kuyruğu işleme hatası.",
        {
          error: message,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: isValidationError
          ? message
          : "Bildirim kuyruğu işlenirken bir hata oluştu.",
      },
      {
        status: isValidationError
          ? 400
          : 500,
      }
    );
  }
}