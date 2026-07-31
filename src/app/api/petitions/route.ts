import { NextRequest, NextResponse } from "next/server";

import { generateTrackingCode } from "@/lib/constants";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { verifyCaptcha } from "@/services/captcha-verification";
import { deliverEmail } from "@/services/email-delivery";
import { createEmailVerificationToken } from "@/services/email-verification-token";
import { verifyIdentity } from "@/services/identity-verification";
import type {
  ApiErrorResponse,
  CreatePetitionRequest,
  CreatePetitionSuccessResponse,
} from "@/types/petition";

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isCreatePetitionRequest(
  body: unknown
): body is CreatePetitionRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value = body as Partial<CreatePetitionRequest>;

  return (
    typeof value.identity === "object" &&
    value.identity !== null &&
    typeof value.identity.firstName === "string" &&
    typeof value.identity.lastName === "string" &&
    typeof value.identity.tcKimlik === "string" &&
    typeof value.identity.birthYear === "number" &&
    typeof value.email === "string" &&
    (value.phone === undefined ||
      typeof value.phone === "string") &&
    typeof value.category === "string" &&
   typeof value.targetUnitCode === "string" &&
    typeof value.subject === "string" &&
    typeof value.content === "string" &&
    typeof value.captchaToken === "string" &&
    typeof value.privacyNoticeVersion === "string" &&
    typeof value.privacyNoticeAcknowledged === "boolean"
  );
}

async function createUniqueTrackingCode(): Promise<string> {
  let trackingCode = generateTrackingCode();

  while (
    await prisma.petition.findUnique({
      where: {
        trackingCode,
      },
      select: {
        id: true,
      },
    })
  ) {
    trackingCode = generateTrackingCode();
  }

  return trackingCode;
}

/**
 * Yetkili kurum personeli için başvuru listesini getirir.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "Yetkisiz erişim.",
      },
      { status: 401 }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz veya süresi dolmuş oturum.",
      },
      { status: 401 }
    );
  }

  try {
    const staffUser = await prisma.staffUser.findUnique({
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

    if (!staffUser || !staffUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Yetkili personel hesabı bulunamadı.",
        },
        { status: 403 }
      );
    }

    const petitions = await prisma.petition.findMany({
      where:
        staffUser.role === "ADMIN"
          ? undefined
          : {
              targetUnitId: staffUser.unitId ?? -1,
            },
      select: {
        id: true,
        trackingCode: true,
        applicantFirstName: true,
        applicantLastName: true,
        category: true,
        status: true,
        priority: true,
        subject: true,
        emailVerifiedAt: true,
        createdAt: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      petitions,
    });
  } catch (error) {
    console.error(
      "Başvuru listesi alınamadı:",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Başvurular alınırken sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}

/**
 * Kullanıcı hesabı oluşturmadan yeni başvuru başlatır.
 */
export async function POST(request: NextRequest) {
  const requestInformation = getRequestInformation(request);

  try {
    const body: unknown = await request.json();

    if (!isCreatePetitionRequest(body)) {
      const response: ApiErrorResponse = {
        success: false,
        error: "Başvuru bilgileri eksik veya geçersiz.",
      };

      return NextResponse.json(response, { status: 400 });
    }

    const firstName = body.identity.firstName.trim();
    const lastName = body.identity.lastName.trim();
    const email = body.email.trim().toLowerCase();
    const phone = body.phone?.trim() || undefined;
    const subject = body.subject.trim();
    const content = body.content.trim();
    const privacyNoticeVersion =
      body.privacyNoticeVersion.trim();

    if (
      !firstName ||
      !lastName ||
      !isValidEmail(email) ||
      !subject ||
      !content ||
      !privacyNoticeVersion
    ) {
      const response: ApiErrorResponse = {
        success: false,
        error: "Zorunlu başvuru alanlarını eksiksiz doldurun.",
      };

      return NextResponse.json(response, { status: 400 });
    }

    if (!body.privacyNoticeAcknowledged) {
      const response: ApiErrorResponse = {
        success: false,
        error:
          "Kişisel verilerin işlenmesine ilişkin aydınlatma metni onaylanmalıdır.",
      };

      return NextResponse.json(response, { status: 400 });
    }

    const targetUnit = await prisma.unit.findFirst({
      where: {
       code: body.targetUnitCode.trim().toUpperCase(),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!targetUnit) {
      const response: ApiErrorResponse = {
        success: false,
        error: "Seçilen hedef birim bulunamadı veya aktif değil.",
      };

      return NextResponse.json(response, { status: 400 });
    }

    const captchaResult = await verifyCaptcha({
      token: body.captchaToken,
      remoteIp: requestInformation.ipAddress,
      expectedAction: "create_petition",
    });

    if (!captchaResult.success) {
      const response: ApiErrorResponse = {
        success: false,
        error:
          captchaResult.message ||
          "Güvenlik doğrulaması başarısız.",
      };

      return NextResponse.json(response, { status: 400 });
    }

    const identityResult = await verifyIdentity({
      firstName,
      lastName,
      tcKimlik: body.identity.tcKimlik,
      birthYear: body.identity.birthYear,
    });

    if (!identityResult.verified) {
      const response: ApiErrorResponse = {
        success: false,
        error:
          identityResult.message ||
          "Kimlik bilgileri doğrulanamadı.",
      };

      return NextResponse.json(response, { status: 400 });
    }

    const trackingCode = await createUniqueTrackingCode();

    const verificationToken =
      createEmailVerificationToken();

    const petition = await prisma.$transaction(
      async (transaction) => {
        const createdPetition =
          await transaction.petition.create({
            data: {
              trackingCode,
              applicantFirstName: firstName,
              applicantLastName: lastName,
              applicantEmail: email,
              applicantPhone: phone,
              identityVerifiedAt: new Date(),
              identityVerificationReference:
                identityResult.referenceId,
              botCheckVerifiedAt: new Date(),
              privacyNoticeVersion,
              privacyNoticeAcknowledgedAt: new Date(),
              category: body.category,
              targetUnitId: targetUnit.id,
              subject,
              content,
              status: "EMAIL_PENDING",
              priority: "NORMAL",
            },
            select: {
              id: true,
              trackingCode: true,
            },
          });

        await transaction.emailVerificationToken.create({
          data: {
            petitionId: createdPetition.id,
            tokenHash: verificationToken.tokenHash,
            expiresAt: verificationToken.expiresAt,
          },
        });

        await transaction.petitionStatusHistory.create({
          data: {
            petitionId: createdPetition.id,
            fromStatus: null,
            toStatus: "EMAIL_PENDING",
            note: "Başvuru oluşturuldu ve e-posta doğrulaması bekleniyor.",
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: "APPLICANT",
            action: "CREATE",
            entityType: "PETITION",
            entityId: String(createdPetition.id),
            newValues: {
              trackingCode: createdPetition.trackingCode,
              category: body.category,
              targetUnitId: targetUnit.id,
              status: "EMAIL_PENDING",
            },
            ipAddress: requestInformation.ipAddress,
            userAgent: requestInformation.userAgent,
            success: true,
          },
        });

        return createdPetition;
      }
    );

    const applicationUrl =
      process.env.APP_URL || "http://localhost:3000";

    const verificationUrl =
      `${applicationUrl}/eposta-dogrula?token=` +
      encodeURIComponent(verificationToken.rawToken);

    const emailResult = await deliverEmail({
      to: email,
      subject: "Mersin Üniversitesi Başvuru E-posta Doğrulaması",
      text: [
        `Sayın ${firstName} ${lastName},`,
        "",
        "Başvurunuzu tamamlamak için aşağıdaki bağlantıyı açın:",
        verificationUrl,
        "",
        "Bu bağlantı 30 dakika süreyle geçerlidir.",
      ].join("\n"),
    });

    if (!emailResult.success) {
      await prisma.auditLog.create({
        data: {
          actorType: "SYSTEM",
          action: "NOTIFY",
          entityType: "PETITION",
          entityId: String(petition.id),
          metadata: {
            notificationType: "EMAIL_VERIFICATION",
          },
          success: false,
          errorMessage:
            emailResult.error ||
            "E-posta gönderimi gerçekleştirilemedi.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuru oluşturuldu ancak doğrulama e-postası gönderilemedi.",
        },
        { status: 503 }
      );
    }

    await prisma.auditLog.create({
      data: {
        actorType: "SYSTEM",
        action: "NOTIFY",
        entityType: "PETITION",
        entityId: String(petition.id),
        metadata: {
          notificationType: "EMAIL_VERIFICATION",
          provider: emailResult.provider,
        },
        success: true,
      },
    });

    const response: CreatePetitionSuccessResponse = {
      success: true,
      message:
        "Başvurunuz oluşturuldu. Devam etmek için e-posta adresinize gönderilen doğrulama bağlantısını açın.",
      verificationRequired: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(
      "Başvuru oluşturma hatası:",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );

    const response: ApiErrorResponse = {
      success: false,
      error: "Başvuru oluşturulurken sunucu hatası oluştu.",
    };

    return NextResponse.json(response, { status: 500 });
  }
}