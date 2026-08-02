import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const MAX_TRACKING_CODE_LENGTH = 24;
const MAX_EMAIL_LENGTH = 255;

interface RouteContext {
  params: Promise<{
    code: string;
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

function isValidTrackingCode(
  trackingCode: string
): boolean {
  return (
    trackingCode.length >= 6 &&
    trackingCode.length <= MAX_TRACKING_CODE_LENGTH &&
    /^[A-Z0-9-]+$/.test(trackingCode)
  );
}

function isValidEmail(email: string): boolean {
  return (
    email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function createErrorResponse(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
      },
    }
  );
}

/**
 * Başvuru sahibinin takip kodu ve e-posta adresiyle
 * doğrulanmış başvurusunu görüntülemesini sağlar.
 *
 * Kişisel bilgiler, kurum içi cevaplar ve kurum içi
 * durum notları başvuru sahibine gönderilmez.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const requestInformation =
    getRequestInformation(request);

  try {
    const { code } = await context.params;

    const trackingCode = decodeURIComponent(code)
      .trim()
      .toUpperCase();

    if (!trackingCode) {
      return createErrorResponse(
        "Takip kodu zorunludur.",
        400
      );
    }

    if (!isValidTrackingCode(trackingCode)) {
      return createErrorResponse(
        "Takip kodu formatı geçersiz.",
        400
      );
    }

    const email = request.nextUrl.searchParams
      .get("email")
      ?.trim()
      .toLowerCase();

    if (!email) {
      return createErrorResponse(
        "Başvuruyu görüntülemek için e-posta adresi zorunludur.",
        400
      );
    }

    if (!isValidEmail(email)) {
      return createErrorResponse(
        "Geçerli bir e-posta adresi girin.",
        400
      );
    }

    const petition = await prisma.petition.findFirst({
      where: {
        trackingCode,
        applicantEmail: email,
        emailVerifiedAt: {
          not: null,
        },
        status: {
          not: "EMAIL_PENDING",
        },
      },
      select: {
        id: true,
        trackingCode: true,
        category: true,
        status: true,
        priority: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
        targetUnit: {
          select: {
            name: true,
          },
        },
        responses: {
          where: {
            visibility: "APPLICANT",
          },
          select: {
            content: true,
            isFinal: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        statusHistory: {
          select: {
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!petition) {
      return createErrorResponse(
        "Başvuru bulunamadı. Takip kodu ve e-posta adresini kontrol edin.",
        404
      );
    }

    await prisma.auditLog.create({
      data: {
        actorType: "APPLICANT",
        action: "READ",
        entityType: "PETITION",
        entityId: String(petition.id),
        metadata: {
          source: "TRACKING_PAGE",
          trackingCode: petition.trackingCode,
        },
        ipAddress:
          requestInformation.ipAddress,
        userAgent:
          requestInformation.userAgent,
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        petition: {
          trackingCode: petition.trackingCode,
          category: petition.category,
          status: petition.status,
          priority: petition.priority,
          subject: petition.subject,
          targetUnitName: petition.targetUnit.name,
          createdAt: petition.createdAt,
          updatedAt: petition.updatedAt,
          responses: petition.responses,
          statusHistory: petition.statusHistory,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, private",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error(
      "Başvuru takip hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return createErrorResponse(
      "Başvuru bilgileri alınırken sunucu hatası oluştu.",
      500
    );
  }
}