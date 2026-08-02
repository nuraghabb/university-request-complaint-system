import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface RequestInformation {
  ipAddress?: string;
  userAgent?: string;
}

function getRequestInformation(
  request: NextRequest
): RequestInformation {
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

/**
 * Yetkili kurum personelinin tek bir başvurunun
 * ayrıntılarını görüntülemesini sağlar.
 */
export async function GET(
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
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz veya süresi dolmuş oturum.",
      },
      {
        status: 401,
        headers: createNoStoreHeaders(),
      }
    );
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

  try {
    const staffUser = await prisma.staffUser.findUnique({
      where: {
        id: payload.staffUserId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        unitId: true,
        isActive: true,
        unit: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!staffUser || !staffUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Yetkili personel hesabı bulunamadı.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const petitionAccessInformation =
      await prisma.petition.findUnique({
        where: {
          id: petitionId,
        },
        select: {
          id: true,
          targetUnitId: true,
          emailVerifiedAt: true,
          status: true,
        },
      });

    if (!petitionAccessInformation) {
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

    const canAccessPetition =
      staffUser.role === "ADMIN" ||
      (staffUser.unitId !== null &&
        staffUser.unitId ===
          petitionAccessInformation.targetUnitId);

    if (!canAccessPetition) {
      await prisma.auditLog.create({
        data: {
          actorType: "STAFF",
          staffActorId: staffUser.id,
          action: "READ",
          entityType: "PETITION",
          entityId: String(petitionId),
          metadata: {
            denied: true,
            reason: "UNIT_ACCESS_DENIED",
            staffRole: staffUser.role,
            staffUnitId: staffUser.unitId,
            petitionTargetUnitId:
              petitionAccessInformation.targetUnitId,
          },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: false,
          errorMessage:
            "Personel, yetkili olmadığı birime ait başvuruyu görüntülemeye çalıştı.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Bu başvuruyu görüntüleme yetkiniz bulunmuyor.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      !petitionAccessInformation.emailVerifiedAt ||
      petitionAccessInformation.status === "EMAIL_PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulaması tamamlanmamış başvurular görüntülenemez.",
        },
        {
          status: 404,
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

        applicantFirstName: true,
        applicantLastName: true,
        applicantEmail: true,
        applicantPhone: true,

        identityVerifiedAt: true,
        botCheckVerifiedAt: true,
        privacyNoticeVersion: true,
        privacyNoticeAcknowledgedAt: true,
        emailVerifiedAt: true,

        category: true,
        subject: true,
        content: true,
        status: true,
        priority: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,

        targetUnit: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            isActive: true,
          },
        },

        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            unit: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },

        attachments: {
          select: {
            id: true,
            originalName: true,
            storageKey: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        assignments: {
          select: {
            id: true,
            note: true,
            createdAt: true,
            endedAt: true,

            fromUnit: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            toUnit: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },

            assignedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },

        responses: {
          select: {
            id: true,
            content: true,
            visibility: true,
            isFinal: true,
            createdAt: true,
            updatedAt: true,

            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                unit: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,

            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
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

    await prisma.auditLog.create({
      data: {
        actorType: "STAFF",
        staffActorId: staffUser.id,
        action: "READ",
        entityType: "PETITION",
        entityId: String(petition.id),
        metadata: {
          trackingCode: petition.trackingCode,
          staffRole: staffUser.role,
          staffUnitId: staffUser.unitId,
        },
        ipAddress: requestInformation.ipAddress,
        userAgent: requestInformation.userAgent,
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        petition,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru ayrıntısı alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru ayrıntıları alınırken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}