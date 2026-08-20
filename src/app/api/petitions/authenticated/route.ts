import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { getApplicantRoleTag } from "@/lib/applicant-tag";
import { getSessionFromRequest } from "@/lib/auth";
import { generateTrackingCode } from "@/lib/constants";
import { calculatePetitionPriority } from "@/lib/petition-priority";
import { prisma } from "@/lib/prisma";

import type {
  ApiErrorResponse,
  AuthenticatedCreatePetitionRequest,
  AuthenticatedCreatePetitionSuccessResponse,
} from "@/types/petition";

const MAX_PHONE_LENGTH = 20;
const MAX_CATEGORY_CODE_LENGTH = 50;
const MAX_TARGET_UNIT_CODE_LENGTH = 50;
const MAX_SUBJECT_LENGTH = 500;
const MAX_CONTENT_LENGTH = 10_000;
const MAX_PRIVACY_NOTICE_VERSION_LENGTH = 30;

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
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

function isValidPhone(phone: string): boolean {
  if (phone.length > MAX_PHONE_LENGTH) {
    return false;
  }

  return /^[0-9+\s()-]+$/.test(phone);
}

function isAuthenticatedCreatePetitionRequest(
  body: unknown
): body is AuthenticatedCreatePetitionRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value = body as Partial<AuthenticatedCreatePetitionRequest>;

  return (
    (value.phone === undefined || typeof value.phone === "string") &&
    typeof value.category === "string" &&
    typeof value.targetUnitCode === "string" &&
    typeof value.subject === "string" &&
    typeof value.content === "string" &&
    typeof value.privacyNoticeVersion === "string" &&
    typeof value.privacyNoticeAcknowledged === "boolean"
  );
}

function createValidationError(
  error: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error },
    { status: 400 }
  );
}

async function createUniqueTrackingCode(): Promise<string> {
  let trackingCode = generateTrackingCode();

  while (
    await prisma.petition.findUnique({
      where: { trackingCode },
      select: { id: true },
    })
  ) {
    trackingCode = generateTrackingCode();
  }

  return trackingCode;
}

/**
 * Oturum açmış öğrenci/akademisyen/personel için başvuru oluşturur.
 * Kimlik ve e-posta doğrulaması atlanır; başvuru doğrudan RECEIVED durumuna geçer.
 * Başvuru sahibi bilgileri oturumdaki hesaptan alınır.
 */
export async function POST(request: NextRequest) {
  const requestInformation = getRequestInformation(request);
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu işlem için giriş yapmanız gereklidir.",
      },
      { status: 401 }
    );
  }

  const isStaffSession = session.type === "STAFF";
  const applicantFirstName = session.user.firstName;
  const applicantLastName = session.user.lastName;
  const applicantEmail = session.user.email;
  const applicantRoleTag = isStaffSession
    ? getApplicantRoleTag("STAFF")
    : getApplicantRoleTag(session.user.role);
  const internalUserId = isStaffSession ? null : session.user.id;
  const createdByStaffId = isStaffSession ? session.user.id : null;

  try {
    const body: unknown = await request.json();

    if (!isAuthenticatedCreatePetitionRequest(body)) {
      return createValidationError(
        "Başvuru bilgileri eksik veya geçersiz."
      );
    }

    const phone = body.phone?.trim() || undefined;
    const category = body.category.trim().toUpperCase();
    const targetUnitCode = body.targetUnitCode.trim().toUpperCase();
    const subject = body.subject.trim();
    const content = body.content.trim();
    const privacyNoticeVersion = body.privacyNoticeVersion.trim();

    if (phone && !isValidPhone(phone)) {
      return createValidationError(
        `Telefon numarası geçersiz veya ${MAX_PHONE_LENGTH} karakterden uzun.`
      );
    }

    if (!category || category.length > MAX_CATEGORY_CODE_LENGTH) {
      return createValidationError(
        "Seçilen başvuru kategorisi geçersiz."
      );
    }

    if (
      !targetUnitCode ||
      targetUnitCode.length > MAX_TARGET_UNIT_CODE_LENGTH
    ) {
      return createValidationError(
        "Seçilen hedef birim kodu geçersiz."
      );
    }

    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
      return createValidationError(
        "Başvuru konusu geçersiz veya çok uzun."
      );
    }

    if (!content || content.length > MAX_CONTENT_LENGTH) {
      return createValidationError(
        "Başvuru içeriği geçersiz veya çok uzun."
      );
    }

    if (
      !privacyNoticeVersion ||
      privacyNoticeVersion.length > MAX_PRIVACY_NOTICE_VERSION_LENGTH
    ) {
      return createValidationError(
        "Aydınlatma metni sürüm bilgisi geçersiz."
      );
    }

    if (!body.privacyNoticeAcknowledged) {
      return createValidationError(
        "Kişisel verilerin işlenmesine ilişkin aydınlatma metni onaylanmalıdır."
      );
    }

    const selectedCategory = await prisma.category.findFirst({
      where: { code: category, isActive: true },
      select: { id: true, code: true, name: true },
    });

    if (!selectedCategory) {
      return createValidationError(
        "Seçilen başvuru kategorisi bulunamadı veya aktif değil."
      );
    }

    const targetUnit = await prisma.unit.findFirst({
      where: { code: targetUnitCode, isActive: true },
      select: { id: true, name: true },
    });

    if (!targetUnit) {
      return createValidationError(
        "Seçilen hedef birim bulunamadı veya aktif değil."
      );
    }

    const { priority, dueAt } = calculatePetitionPriority(
      category,
      targetUnitCode
    );

    const trackingCode = await createUniqueTrackingCode();
    const now = new Date();

    const petition = await prisma.$transaction(async (transaction) => {
      const petitionData: Prisma.PetitionUncheckedCreateInput = {
        trackingCode,
        applicantFirstName,
        applicantLastName,
        applicantEmail,
        applicantPhone: phone,
        internalUserId,
        createdByStaffId,
        applicantRoleTag,
        identityVerifiedAt: now,
        botCheckVerifiedAt: now,
        privacyNoticeVersion,
        privacyNoticeAcknowledgedAt: now,
        emailVerifiedAt: now,
        categoryId: selectedCategory.id,
        targetUnitId: targetUnit.id,
        subject,
        content,
        status: "RECEIVED",
        priority,
        dueAt,
      };

      const createdPetition = await transaction.petition.create({
        data: petitionData,
        select: {
          id: true,
          trackingCode: true,
        },
      });

      await transaction.petitionStatusHistory.create({
        data: {
          petitionId: createdPetition.id,
          fromStatus: null,
          toStatus: "RECEIVED",
          note: `${applicantRoleTag} oturumuyla başvuru oluşturuldu; e-posta doğrulaması atlandı.`,
        },
      });

      await transaction.notificationOutbox.create({
        data: {
          petitionId: createdPetition.id,
          type: "PETITION_RECEIVED",
          recipientEmail: applicantEmail,
          subject: "Mersin Üniversitesi Başvurunuz Alındı",
          payload: {
            applicantName: `${applicantFirstName} ${applicantLastName}`,
            trackingCode: createdPetition.trackingCode,
            status: "RECEIVED",
          },
          status: "PENDING",
          deduplicationKey: `petition-received:${createdPetition.id}`,
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
            categoryId: selectedCategory.id,
            categoryCode: selectedCategory.code,
            targetUnitId: targetUnit.id,
            status: "RECEIVED",
            applicantRoleTag,
            ...(internalUserId !== null
              ? { internalUserId }
              : { applicantEmail }),
          },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: true,
        },
      });

      return createdPetition;
    });

    const response: AuthenticatedCreatePetitionSuccessResponse = {
      success: true,
      message:
        "Başvurunuz başarıyla oluşturuldu ve ilgili birime iletildi.",
      verificationRequired: false,
      trackingCode: petition.trackingCode,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(
      "Kimlik doğrulamalı başvuru oluşturma hatası:",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Başvuru oluşturulurken sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
