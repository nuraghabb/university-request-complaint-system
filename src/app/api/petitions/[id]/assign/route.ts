import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface AssignPetitionRequest {
  assignedStaffId: number;
  note?: string;
}

const MAX_ASSIGNMENT_NOTE_LENGTH = 2_000;

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

  if (
    !Number.isSafeInteger(petitionId) ||
    petitionId <= 0
  ) {
    return null;
  }

  return petitionId;
}

function isAssignPetitionRequest(
  body: unknown
): body is AssignPetitionRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value = body as Partial<AssignPetitionRequest>;

  return (
    typeof value.assignedStaffId === "number" &&
    Number.isSafeInteger(value.assignedStaffId) &&
    value.assignedStaffId > 0 &&
    (value.note === undefined ||
      typeof value.note === "string")
  );
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

/**
 * Başvuruyu aktif bir kurum personeline atar.
 *
 * Yetkiler:
 * - ADMIN
 * - UNIT_MANAGER
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

  if (!isAssignPetitionRequest(body)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Atanacak personel bilgisi eksik veya geçersiz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const note = body.note?.trim() || undefined;

  if (
    note &&
    note.length > MAX_ASSIGNMENT_NOTE_LENGTH
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `Atama notu en fazla ${MAX_ASSIGNMENT_NOTE_LENGTH} karakter olabilir.`,
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
            "Başvuru atama işlemi için yetkiniz bulunmuyor.",
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
            "E-posta doğrulaması tamamlanmamış başvurular personele atanamaz.",
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
            "Yalnızca kendi biriminize ait başvuruları atayabilirsiniz.",
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
            "Kapatılmış veya reddedilmiş başvurular personele atanamaz.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const assignedStaff =
      await prisma.staffUser.findUnique({
        where: {
          id: body.assignedStaffId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          unitId: true,
          isActive: true,
        },
      });

    if (!assignedStaff || !assignedStaff.isActive) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Atanacak personel bulunamadı veya hesabı pasif durumda.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (assignedStaff.unitId !== petition.targetUnitId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuru yalnızca hedef birimdeki aktif personele atanabilir.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const previousStatus = petition.status;
    const assignmentDate = new Date();

    const updatedPetition = await prisma.$transaction(
      async (transaction) => {
        await transaction.petitionAssignment.updateMany({
          where: {
            petitionId,
            endedAt: null,
          },
          data: {
            endedAt: assignmentDate,
          },
        });

        await transaction.petitionAssignment.create({
          data: {
            petitionId,
            fromUnitId: petition.targetUnitId,
            toUnitId: petition.targetUnitId,
            assignedToId: assignedStaff.id,
            assignedById: currentStaff.id,
            note,
          },
        });

        const updated =
          await transaction.petition.update({
            where: {
              id: petitionId,
            },
            data: {
              assignedStaffId: assignedStaff.id,
              status: "ASSIGNED",
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
              assignedStaff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
          });

        await transaction.petitionStatusHistory.create({
          data: {
            petitionId,
            fromStatus: previousStatus,
            toStatus: "ASSIGNED",
            changedById: currentStaff.id,
            note:
              note ||
              `${assignedStaff.firstName} ${assignedStaff.lastName} personeline atandı.`,
          },
        });

        await transaction.notificationOutbox.create({
          data: {
            petitionId,
            type: "PETITION_ASSIGNED",
            recipientEmail: assignedStaff.email,
            subject:
              "Yeni bir başvuru tarafınıza atandı",
            payload: {
              trackingCode: petition.trackingCode,
              petitionId,
              subject: petition.subject,
              assignedStaffId: assignedStaff.id,
            },
            status: "PENDING",
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: "STAFF",
            staffActorId: currentStaff.id,
            action: "ASSIGN",
            entityType: "PETITION",
            entityId: String(petitionId),
            oldValues: {
              assignedStaffId:
                petition.assignedStaffId,
              status: previousStatus,
            },
            newValues: {
              assignedStaffId: assignedStaff.id,
              status: "ASSIGNED",
            },
            metadata: {
              targetUnitId: petition.targetUnitId,
              noteProvided: Boolean(note),
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
        message: "Başvuru personele başarıyla atandı.",
        petition: updatedPetition,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru atama hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru atanırken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}