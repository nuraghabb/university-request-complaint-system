import { NextRequest, NextResponse } from "next/server";

import type { PetitionStatus } from "@prisma/client";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

type ClosingStatus = Extract<
  PetitionStatus,
  "CLOSED" | "REJECTED"
>;

interface ClosePetitionRequest {
  status: ClosingStatus;
  reason: string;
}

const MAX_REASON_LENGTH = 2_000;

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

function getRequestInformation(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    ipAddress:
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent:
      request.headers.get("user-agent") || undefined,
  };
}

function parsePetitionId(value: string): number | null {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const petitionId = Number(normalizedValue);

  if (
    !Number.isSafeInteger(petitionId) ||
    petitionId <= 0
  ) {
    return null;
  }

  return petitionId;
}

function isClosingStatus(
  value: unknown
): value is ClosingStatus {
  return value === "CLOSED" || value === "REJECTED";
}

function isClosePetitionRequest(
  body: unknown
): body is ClosePetitionRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value = body as Partial<ClosePetitionRequest>;

  return (
    isClosingStatus(value.status) &&
    typeof value.reason === "string"
  );
}

/**
 * Başvuruyu kapatır veya reddeder.
 *
 * Yetkiler:
 * - ADMIN
 * - Başvurunun hedef birimindeki UNIT_MANAGER
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const requestInformation =
    getRequestInformation(request);

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "Yetkisiz erişim.",
      },
      {
        status: 401,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    const response = NextResponse.json(
      {
        success: false,
        error: "Geçersiz veya süresi dolmuş oturum.",
      },
      {
        status: 401,
        headers: createNoStoreHeaders(),
      }
    );

    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  }

  const { id } = await context.params;
  const petitionId = parsePetitionId(id);

  if (!petitionId) {
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz başvuru kimliği.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz JSON verisi.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  if (!isClosePetitionRequest(body)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Kapatma veya reddetme bilgileri eksik ya da geçersiz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const nextStatus = body.status;
  const reason = body.reason.trim();

  if (!reason) {
    return NextResponse.json(
      {
        success: false,
        error:
          nextStatus === "REJECTED"
            ? "Ret gerekçesi boş bırakılamaz."
            : "Kapatma açıklaması boş bırakılamaz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  if (reason.length > MAX_REASON_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `Açıklama en fazla ${MAX_REASON_LENGTH} karakter olabilir.`,
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  try {
    const currentStaff =
      await prisma.staffUser.findUnique({
        where: {
          id: payload.staffUserId,
        },
        select: {
          id: true,
          role: true,
          unitId: true,
          isActive: true,
        },
      });

    if (!currentStaff || !currentStaff.isActive) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Personel hesabı bulunamadı veya pasif durumda.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      currentStaff.role !== "ADMIN" &&
      currentStaff.role !== "UNIT_MANAGER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuruyu kapatma veya reddetme yetkiniz bulunmuyor.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const petition = await prisma.petition.findUnique({
      where: {
        id: petitionId,
      },
      select: {
        id: true,
        trackingCode: true,
        subject: true,
        applicantEmail: true,
        status: true,
        targetUnitId: true,
        assignedStaffId: true,
        emailVerifiedAt: true,
      },
    });

    if (!petition) {
      return NextResponse.json(
        {
          success: false,
          error: "Başvuru bulunamadı.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      !petition.emailVerifiedAt ||
      petition.status === "EMAIL_PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulaması tamamlanmamış başvurular kapatılamaz veya reddedilemez.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      currentStaff.role === "UNIT_MANAGER" &&
      currentStaff.unitId !== petition.targetUnitId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yalnızca kendi biriminize ait başvuruları kapatabilir veya reddedebilirsiniz.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      petition.status === "CLOSED" ||
      petition.status === "REJECTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuru daha önce kapatılmış veya reddedilmiş.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const previousStatus = petition.status;
    const closingDate = new Date();

    const updatedPetition = await prisma.$transaction(
      async (transaction) => {
        await transaction.petitionAssignment.updateMany({
          where: {
            petitionId,
            endedAt: null,
          },
          data: {
            endedAt: closingDate,
          },
        });

        const updated =
          await transaction.petition.update({
            where: {
              id: petitionId,
            },
            data: {
              status: nextStatus,
              assignedStaffId: null,
            },
            select: {
              id: true,
              trackingCode: true,
              subject: true,
              status: true,
              priority: true,
              updatedAt: true,
              targetUnit: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          });

        await transaction.petitionStatusHistory.create({
          data: {
            petitionId,
            fromStatus: previousStatus,
            toStatus: nextStatus,
            changedById: currentStaff.id,
            note: reason,
          },
        });

        await transaction.notificationOutbox.create({
          data: {
            petitionId,
            type:
              nextStatus === "CLOSED"
                ? "PETITION_CLOSED"
                : "PETITION_REJECTED",
            recipientEmail: petition.applicantEmail,
            subject:
              nextStatus === "CLOSED"
                ? "Başvurunuz kapatıldı"
                : "Başvurunuz reddedildi",
            payload: {
              petitionId,
              trackingCode: petition.trackingCode,
              subject: petition.subject,
              status: nextStatus,
              reason,
            },
            status: "PENDING",
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: "STAFF",
            staffActorId: currentStaff.id,
            action:
              nextStatus === "CLOSED"
                ? "CLOSE"
                : "STATUS_CHANGE",
            entityType: "PETITION",
            entityId: String(petitionId),
            oldValues: {
              status: previousStatus,
              assignedStaffId:
                petition.assignedStaffId,
            },
            newValues: {
              status: nextStatus,
              assignedStaffId: null,
            },
            metadata: {
              trackingCode: petition.trackingCode,
              closureType: nextStatus,
              reasonLength: reason.length,
              applicantNotificationQueued: true,
            },
            ipAddress:
              requestInformation.ipAddress,
            userAgent:
              requestInformation.userAgent,
            success: true,
          },
        });

        return updated;
      }
    );

    return NextResponse.json(
      {
        success: true,
        message:
          nextStatus === "CLOSED"
            ? "Başvuru başarıyla kapatıldı."
            : "Başvuru başarıyla reddedildi.",
        petition: updatedPetition,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru kapatma/reddetme hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru kapatılırken veya reddedilirken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}