import { NextRequest, NextResponse } from "next/server";

import type { PetitionStatus } from "@prisma/client";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface UpdatePetitionStatusRequest {
  status: PetitionStatus;
  note?: string;
}

const ALLOWED_STATUSES = [
  "RECEIVED",
  "IN_REVIEW",
] as const satisfies readonly PetitionStatus[];

const MAX_STATUS_NOTE_LENGTH = 2_000;

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

function isAllowedStatus(
  value: unknown
): value is (typeof ALLOWED_STATUSES)[number] {
  return (
    typeof value === "string" &&
    (ALLOWED_STATUSES as readonly string[]).includes(value)
  );
}

function isUpdatePetitionStatusRequest(
  body: unknown
): body is UpdatePetitionStatusRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value =
    body as Partial<UpdatePetitionStatusRequest>;

  return (
    isAllowedStatus(value.status) &&
    (value.note === undefined ||
      typeof value.note === "string")
  );
}

/**
 * Başvurunun normal işlem durumunu günceller.
 *
 * Bu endpoint yalnızca:
 * - RECEIVED
 * - IN_REVIEW
 *
 * durumları için kullanılır.
 */
export async function PATCH(
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

  if (!isUpdatePetitionStatusRequest(body)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Durum bilgisi eksik veya bu işlem için geçersiz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const nextStatus = body.status;
  const note = body.note?.trim() || undefined;

  if (
    note &&
    note.length > MAX_STATUS_NOTE_LENGTH
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `Durum açıklaması en fazla ${MAX_STATUS_NOTE_LENGTH} karakter olabilir.`,
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

    const petition = await prisma.petition.findUnique({
      where: {
        id: petitionId,
      },
      select: {
        id: true,
        trackingCode: true,
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
            "E-posta doğrulaması tamamlanmamış başvuruların durumu değiştirilemez.",
        },
        {
          status: 409,
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
            "Kapatılmış veya reddedilmiş başvuruların durumu değiştirilemez.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const isAdmin = currentStaff.role === "ADMIN";

    const isUnitManagerWithAccess =
      currentStaff.role === "UNIT_MANAGER" &&
      currentStaff.unitId !== null &&
      currentStaff.unitId === petition.targetUnitId;

    const isAssignedUnitStaff =
      currentStaff.role === "UNIT_STAFF" &&
      currentStaff.unitId !== null &&
      currentStaff.unitId === petition.targetUnitId &&
      petition.assignedStaffId === currentStaff.id;

    const canChangeStatus =
      isAdmin ||
      isUnitManagerWithAccess ||
      isAssignedUnitStaff;

    if (!canChangeStatus) {
      await prisma.auditLog.create({
        data: {
          actorType: "STAFF",
          staffActorId: currentStaff.id,
          action: "STATUS_CHANGE",
          entityType: "PETITION",
          entityId: String(petitionId),
          metadata: {
            denied: true,
            reason: "STATUS_CHANGE_ACCESS_DENIED",
            staffRole: currentStaff.role,
            staffUnitId: currentStaff.unitId,
            petitionTargetUnitId: petition.targetUnitId,
            petitionAssignedStaffId:
              petition.assignedStaffId,
            requestedStatus: nextStatus,
          },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: false,
          errorMessage:
            "Personel, yetkili olmadığı başvurunun durumunu değiştirmeye çalıştı.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Bu başvurunun durumunu değiştirme yetkiniz bulunmuyor.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (petition.status === nextStatus) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuru zaten seçilen durumda bulunuyor.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const previousStatus = petition.status;

    const updatedPetition = await prisma.$transaction(
      async (transaction) => {
        const updated =
          await transaction.petition.update({
            where: {
              id: petitionId,
            },
            data: {
              status: nextStatus,
            },
            select: {
              id: true,
              trackingCode: true,
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
              assignedStaff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
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
            note:
              note ||
              (nextStatus === "IN_REVIEW"
                ? "Başvuru incelemeye alındı."
                : "Başvuru alındı durumuna getirildi."),
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: "STAFF",
            staffActorId: currentStaff.id,
            action: "STATUS_CHANGE",
            entityType: "PETITION",
            entityId: String(petitionId),
            oldValues: {
              status: previousStatus,
            },
            newValues: {
              status: nextStatus,
            },
            metadata: {
              trackingCode: petition.trackingCode,
              noteProvided: Boolean(note),
            },
            ipAddress: requestInformation.ipAddress,
            userAgent: requestInformation.userAgent,
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
          "Başvuru durumu başarıyla güncellendi.",
        petition: updatedPetition,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru durumu güncelleme hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru durumu güncellenirken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}