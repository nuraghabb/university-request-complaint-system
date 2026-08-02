import { NextRequest, NextResponse } from "next/server";

import type { PetitionPriority } from "@prisma/client";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface UpdatePetitionPriorityRequest {
  priority: PetitionPriority;
  note?: string;
}

const ALLOWED_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const satisfies readonly PetitionPriority[];

const MAX_PRIORITY_NOTE_LENGTH = 2_000;

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

function isAllowedPriority(
  value: unknown
): value is (typeof ALLOWED_PRIORITIES)[number] {
  return (
    typeof value === "string" &&
    (ALLOWED_PRIORITIES as readonly string[]).includes(value)
  );
}

function isUpdatePetitionPriorityRequest(
  body: unknown
): body is UpdatePetitionPriorityRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value =
    body as Partial<UpdatePetitionPriorityRequest>;

  return (
    isAllowedPriority(value.priority) &&
    (value.note === undefined ||
      typeof value.note === "string")
  );
}

/**
 * Yetkili kurum personelinin başvuru önceliğini
 * güncellemesini sağlar.
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

  if (!isUpdatePetitionPriorityRequest(body)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Öncelik bilgisi eksik veya geçersiz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const nextPriority = body.priority;
  const note = body.note?.trim() || undefined;

  if (
    note &&
    note.length > MAX_PRIORITY_NOTE_LENGTH
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `Öncelik açıklaması en fazla ${MAX_PRIORITY_NOTE_LENGTH} karakter olabilir.`,
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
        priority: true,
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
            "E-posta doğrulaması tamamlanmamış başvuruların önceliği değiştirilemez.",
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
            "Kapatılmış veya reddedilmiş başvuruların önceliği değiştirilemez.",
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

    const canChangePriority =
      isAdmin ||
      isUnitManagerWithAccess ||
      isAssignedUnitStaff;

    if (!canChangePriority) {
      await prisma.auditLog.create({
        data: {
          actorType: "STAFF",
          staffActorId: currentStaff.id,
          action: "UPDATE",
          entityType: "PETITION",
          entityId: String(petitionId),
          metadata: {
            denied: true,
            reason: "PRIORITY_CHANGE_ACCESS_DENIED",
            staffRole: currentStaff.role,
            staffUnitId: currentStaff.unitId,
            petitionTargetUnitId: petition.targetUnitId,
            petitionAssignedStaffId:
              petition.assignedStaffId,
            requestedPriority: nextPriority,
          },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: false,
          errorMessage:
            "Personel, yetkili olmadığı başvurunun önceliğini değiştirmeye çalıştı.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Bu başvurunun önceliğini değiştirme yetkiniz bulunmuyor.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (petition.priority === nextPriority) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuru zaten seçilen öncelik düzeyinde bulunuyor.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const previousPriority = petition.priority;

    const updatedPetition = await prisma.$transaction(
      async (transaction) => {
        const updated =
          await transaction.petition.update({
            where: {
              id: petitionId,
            },
            data: {
              priority: nextPriority,
            },
            select: {
              id: true,
              trackingCode: true,
              priority: true,
              status: true,
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

        await transaction.auditLog.create({
          data: {
            actorType: "STAFF",
            staffActorId: currentStaff.id,
            action: "UPDATE",
            entityType: "PETITION",
            entityId: String(petitionId),
            oldValues: {
              priority: previousPriority,
            },
            newValues: {
              priority: nextPriority,
            },
            metadata: {
              trackingCode: petition.trackingCode,
              updateType: "PRIORITY_CHANGE",
              noteProvided: Boolean(note),
              ...(note ? { note } : {}),
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
          "Başvuru önceliği başarıyla güncellendi.",
        petition: updatedPetition,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru önceliği güncelleme hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru önceliği güncellenirken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}