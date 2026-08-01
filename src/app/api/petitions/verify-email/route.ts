import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  hashEmailVerificationToken,
  isEmailVerificationTokenExpired,
} from "@/services/email-verification-token";

interface VerifyEmailRequestBody {
  token?: unknown;
}

interface RequestInformation {
  ipAddress?: string;
  userAgent?: string;
}

class VerificationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationConflictError";
  }
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

export async function POST(request: NextRequest) {
  const requestInformation =
    getRequestInformation(request);

  try {
    const body =
      (await request.json()) as VerifyEmailRequestBody;

    if (
      typeof body.token !== "string" ||
      !body.token.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulama bağlantısı eksik veya geçersiz.",
        },
        { status: 400 }
      );
    }

    const tokenHash = hashEmailVerificationToken(
      body.token
    );

    const tokenRecord =
      await prisma.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },
        select: {
          id: true,
          petitionId: true,
          expiresAt: true,
          usedAt: true,
          petition: {
            select: {
              id: true,
              trackingCode: true,
              applicantFirstName: true,
              applicantLastName: true,
              applicantEmail: true,
              emailVerifiedAt: true,
              status: true,
            },
          },
        },
      });

    if (!tokenRecord) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulama bağlantısı geçersiz.",
        },
        { status: 400 }
      );
    }

    if (
      tokenRecord.petition.emailVerifiedAt &&
      tokenRecord.petition.status !== "EMAIL_PENDING"
    ) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message:
          "E-posta adresiniz daha önce doğrulanmış.",
        petition: {
          trackingCode:
            tokenRecord.petition.trackingCode,
          status: tokenRecord.petition.status,
        },
      });
    }

    if (tokenRecord.usedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu doğrulama bağlantısı daha önce kullanılmış.",
        },
        { status: 409 }
      );
    }

    if (
      isEmailVerificationTokenExpired(
        tokenRecord.expiresAt
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulama bağlantısının süresi dolmuş.",
        },
        { status: 410 }
      );
    }

    if (
      tokenRecord.petition.status !== "EMAIL_PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuru e-posta doğrulaması için uygun durumda değil.",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const verifiedPetition =
      await prisma.$transaction(
        async (transaction) => {
          /*
           * Aynı doğrulama bağlantısının eş zamanlı olarak
           * birden fazla kez kullanılmasını engeller.
           */
          const claimedToken =
            await transaction.emailVerificationToken.updateMany(
              {
                where: {
                  id: tokenRecord.id,
                  usedAt: null,
                  expiresAt: {
                    gt: now,
                  },
                },
                data: {
                  usedAt: now,
                },
              }
            );

          if (claimedToken.count !== 1) {
            throw new VerificationConflictError(
              "Doğrulama bağlantısı kullanılmış veya süresi dolmuş."
            );
          }

          const updatedPetition =
            await transaction.petition.update({
              where: {
                id: tokenRecord.petitionId,
              },
              data: {
                emailVerifiedAt: now,
                status: "RECEIVED",
              },
              select: {
                id: true,
                trackingCode: true,
                status: true,
                applicantEmail: true,
                applicantFirstName: true,
                applicantLastName: true,
              },
            });

          await transaction.petitionStatusHistory.create({
            data: {
              petitionId: updatedPetition.id,
              fromStatus: "EMAIL_PENDING",
              toStatus: "RECEIVED",
              note:
                "Başvuru sahibinin e-posta adresi doğrulandı ve başvuru kuruma iletildi.",
            },
          });

          await transaction.auditLog.create({
            data: {
              actorType: "APPLICANT",
              action: "VERIFY",
              entityType: "PETITION",
              entityId: String(updatedPetition.id),
              oldValues: {
                status: "EMAIL_PENDING",
                emailVerified: false,
              },
              newValues: {
                status: "RECEIVED",
                emailVerified: true,
              },
              metadata: {
                verificationType: "EMAIL",
              },
              ipAddress:
                requestInformation.ipAddress,
              userAgent:
                requestInformation.userAgent,
              success: true,
            },
          });

          /*
           * E-posta doğrulamasından sonra gönderilecek
           * bilgilendirme mesajı kuyruğa eklenir.
           * Açık doğrulama tokenı payload içine yazılmaz.
           */
          await transaction.notificationOutbox.create({
            data: {
              petitionId: updatedPetition.id,
              type: "PETITION_RECEIVED",
              recipientEmail:
                updatedPetition.applicantEmail,
              subject:
                "Mersin Üniversitesi Başvurunuz Alındı",
              payload: {
                applicantName:
                  `${updatedPetition.applicantFirstName} ` +
                  updatedPetition.applicantLastName,
                trackingCode:
                  updatedPetition.trackingCode,
                status: "RECEIVED",
              },
              status: "PENDING",
              deduplicationKey:
                `petition-received:${updatedPetition.id}`,
            },
          });

          return updatedPetition;
        }
      );

    return NextResponse.json({
      success: true,
      alreadyVerified: false,
      message:
        "E-posta adresiniz doğrulandı. Başvurunuz başarıyla kuruma iletildi.",
      petition: {
        trackingCode:
          verifiedPetition.trackingCode,
        status: verifiedPetition.status,
      },
    });
  } catch (error) {
    if (error instanceof VerificationConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
      );
    }

    console.error(
      "E-posta doğrulama hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "E-posta doğrulaması sırasında sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}