import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface ForwardPetitionRequest {
  targetUnitId: number;
  note: string;
}

const MAX_FORWARD_NOTE_LENGTH = 2_000;

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

function parsePetitionId(value: string): number | null {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const petitionId = Number(normalizedValue);

  if (!Number.isSafeInteger(petitionId) || petitionId <= 0) {
    return null;
  }

  return petitionId;
}

function isForwardPetitionRequest(
  body: unknown
): body is ForwardPetitionRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value = body as Partial<ForwardPetitionRequest>;

  return (
    typeof value.targetUnitId === "number" &&
    Number.isSafeInteger(value.targetUnitId) &&
    value.targetUnitId > 0 &&
    typeof value.note === "string"
  );
}

function getRequestInformation(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    ipAddress:
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

/**
 * Başvuruyu başka bir kurumsal birime yönlendirir.
 *
 * Yetkiler:
 * - ADMIN
 * - UNIT_MANAGER
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const requestInformation = getRequestInformation(request);

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

  if (!isForwardPetitionRequest(body)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Hedef birim veya yönlendirme açıklaması geçersiz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const note = body.note.trim();

  if (!note) {
    return NextResponse.json(
      {
        success: false,
        error: "Yönlendirme açıklaması boş bırakılamaz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  if (note.length > MAX_FORWARD_NOTE_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `Yönlendirme açıklaması en fazla ${MAX_FORWARD_NOTE_LENGTH} karakter olabilir.`,
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  try {
    const currentStaff = await prisma.staffUser.findUnique({
      where: {
        id: payload.staffUserId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
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
            "Başvuru yönlendirme işlemi için yetkiniz bulunmuyor.",
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
        status: true,
        priority: true,
        targetUnitId: true,
        assignedStaffId: true,
        applicantEmail: true,
        emailVerifiedAt: true,
        targetUnit: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
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
            "E-posta doğrulaması tamamlanmamış başvurular yönlendirilemez.",
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
            "Kapatılmış veya reddedilmiş başvurular yönlendirilemez.",
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
            "Yalnızca kendi biriminize ait başvuruları yönlendirebilirsiniz.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (body.targetUnitId === petition.targetUnitId) {
      return NextResponse.json(
        {
          success: false,
          error: "Başvuru zaten seçilen birimde bulunuyor.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const targetUnit = await prisma.unit.findUnique({
      where: {
        id: body.targetUnitId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    if (!targetUnit || !targetUnit.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Hedef birim bulunamadı veya aktif değil.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const previousStatus = petition.status;
    const previousUnitId = petition.targetUnitId;
    const forwardingDate = new Date();

    const updatedPetition = await prisma.$transaction(
      async (transaction) => {
        await transaction.petitionAssignment.updateMany({
          where: {
            petitionId,
            endedAt: null,
          },
          data: {
            endedAt: forwardingDate,
          },
        });

        await transaction.petitionAssignment.create({
          data: {
            petitionId,
            fromUnitId: previousUnitId,
            toUnitId: targetUnit.id,
            assignedToId: null,
            assignedById: currentStaff.id,
            note,
          },
        });

        const updated = await transaction.petition.update({
          where: {
            id: petitionId,
          },
          data: {
            targetUnitId: targetUnit.id,
            assignedStaffId: null,
            status: "FORWARDED",
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
                email: true,
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
            toStatus: "FORWARDED",
            changedById: currentStaff.id,
            note,
          },
        });

        if (targetUnit.email) {
          await transaction.notificationOutbox.create({
            data: {
              petitionId,
              type: "PETITION_FORWARDED",
              recipientEmail: targetUnit.email,
              subject:
                "Biriminize yeni bir başvuru yönlendirildi",
              payload: {
                petitionId,
                trackingCode: petition.trackingCode,
                subject: petition.subject,
                fromUnitId: previousUnitId,
                fromUnitName: petition.targetUnit.name,
                toUnitId: targetUnit.id,
                toUnitName: targetUnit.name,
              },
              status: "PENDING",
            },
          });
        }

        await transaction.auditLog.create({
          data: {
            actorType: "STAFF",
            staffActorId: currentStaff.id,
            action: "FORWARD",
            entityType: "PETITION",
            entityId: String(petitionId),
            oldValues: {
              targetUnitId: previousUnitId,
              assignedStaffId: petition.assignedStaffId,
              status: previousStatus,
            },
            newValues: {
              targetUnitId: targetUnit.id,
              assignedStaffId: null,
              status: "FORWARDED",
            },
            metadata: {
              fromUnitName: petition.targetUnit.name,
              toUnitName: targetUnit.name,
              noteProvided: true,
              notificationQueued: Boolean(targetUnit.email),
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
          "Başvuru başka birime başarıyla yönlendirildi.",
        petition: updatedPetition,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru yönlendirme hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru yönlendirilirken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}