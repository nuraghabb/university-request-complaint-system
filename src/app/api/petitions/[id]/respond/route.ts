import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

type ResponseVisibility = "INTERNAL" | "APPLICANT";

interface CreatePetitionResponseRequest {
  content: string;
  visibility: ResponseVisibility;
  isFinal?: boolean;
}

const MAX_RESPONSE_CONTENT_LENGTH = 10_000;

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

function isResponseVisibility(
  value: unknown
): value is ResponseVisibility {
  return value === "INTERNAL" || value === "APPLICANT";
}

function isCreatePetitionResponseRequest(
  body: unknown
): body is CreatePetitionResponseRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value =
    body as Partial<CreatePetitionResponseRequest>;

  return (
    typeof value.content === "string" &&
    isResponseVisibility(value.visibility) &&
    (value.isFinal === undefined ||
      typeof value.isFinal === "boolean")
  );
}

/**
 * Yetkili personelin başvuruya kurum içi not veya
 * başvuru sahibine açık cevap eklemesini sağlar.
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

  if (!isCreatePetitionResponseRequest(body)) {
    return NextResponse.json(
      {
        success: false,
        error: "Cevap bilgileri eksik veya geçersiz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const content = body.content.trim();
  const visibility = body.visibility;
  const isFinal = body.isFinal ?? false;

  if (!content) {
    return NextResponse.json(
      {
        success: false,
        error: "Cevap içeriği boş bırakılamaz.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  if (content.length > MAX_RESPONSE_CONTENT_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `Cevap içeriği en fazla ${MAX_RESPONSE_CONTENT_LENGTH} karakter olabilir.`,
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  if (isFinal && visibility !== "APPLICANT") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Nihai cevap yalnızca başvuru sahibine açık olarak eklenebilir.",
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
          email: true,
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
            "E-posta doğrulaması tamamlanmamış başvurular cevaplanamaz.",
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
            "Kapatılmış veya reddedilmiş başvurulara cevap eklenemez.",
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

    const canRespond =
      isAdmin ||
      isUnitManagerWithAccess ||
      isAssignedUnitStaff;

    if (!canRespond) {
      await prisma.auditLog.create({
        data: {
          actorType: "STAFF",
          staffActorId: currentStaff.id,
          action: "RESPOND",
          entityType: "PETITION",
          entityId: String(petitionId),
          metadata: {
            denied: true,
            reason: "PETITION_RESPONSE_ACCESS_DENIED",
            staffRole: currentStaff.role,
            staffUnitId: currentStaff.unitId,
            petitionTargetUnitId: petition.targetUnitId,
            petitionAssignedStaffId:
              petition.assignedStaffId,
          },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: false,
          errorMessage:
            "Personel, yetkili olmadığı bir başvuruya cevap eklemeye çalıştı.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Bu başvuruya cevap ekleme yetkiniz bulunmuyor.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const previousStatus = petition.status;

    const nextStatus =
      visibility === "APPLICANT"
        ? "ANSWERED"
        : previousStatus;

    const result = await prisma.$transaction(
      async (transaction) => {
        const createdResponse =
          await transaction.petitionResponse.create({
            data: {
              petitionId,
              authorId: currentStaff.id,
              content,
              visibility,
              isFinal,
            },
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
                  role: true,
                },
              },
            },
          });

        if (nextStatus !== previousStatus) {
          await transaction.petition.update({
            where: {
              id: petitionId,
            },
            data: {
              status: nextStatus,
            },
          });

          await transaction.petitionStatusHistory.create({
            data: {
              petitionId,
              fromStatus: previousStatus,
              toStatus: nextStatus,
              changedById: currentStaff.id,
              note: isFinal
                ? "Başvuru sahibine nihai cevap verildi."
                : "Başvuru sahibine cevap verildi.",
            },
          });
        }

        if (visibility === "APPLICANT") {
          await transaction.notificationOutbox.create({
            data: {
              petitionId,
              type: "PETITION_ANSWERED",
              recipientEmail: petition.applicantEmail,
              subject:
                "Başvurunuza kurum cevabı eklendi",
              payload: {
                petitionId,
                responseId: createdResponse.id,
                trackingCode: petition.trackingCode,
                subject: petition.subject,
                isFinal,
              },
              status: "PENDING",
            },
          });
        }

        await transaction.auditLog.create({
          data: {
            actorType: "STAFF",
            staffActorId: currentStaff.id,
            action: "RESPOND",
            entityType: "PETITION",
            entityId: String(petitionId),
            oldValues: {
              status: previousStatus,
            },
            newValues: {
              responseId: createdResponse.id,
              visibility,
              isFinal,
              status: nextStatus,
            },
            metadata: {
              responseLength: content.length,
              applicantNotificationQueued:
                visibility === "APPLICANT",
            },
            ipAddress: requestInformation.ipAddress,
            userAgent: requestInformation.userAgent,
            success: true,
          },
        });

        return createdResponse;
      }
    );

    return NextResponse.json(
      {
        success: true,
        message:
          visibility === "APPLICANT"
            ? "Cevap başvuru sahibine başarıyla iletilmek üzere kaydedildi."
            : "Kurum içi not başarıyla kaydedildi.",
        response: result,
        petitionStatus:
          visibility === "APPLICANT"
            ? "ANSWERED"
            : previousStatus,
      },
      {
        status: 201,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru cevaplama hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuruya cevap eklenirken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}