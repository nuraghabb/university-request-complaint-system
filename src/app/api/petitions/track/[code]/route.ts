import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { code } = await context.params;
    const trackingCode = code.trim().toUpperCase();

    if (!trackingCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Takip kodu zorunludur.",
        },
        { status: 400 }
      );
    }

    const email = request.nextUrl.searchParams
      .get("email")
      ?.trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuruyu görüntülemek için e-posta adresi zorunludur.",
        },
        { status: 400 }
      );
    }

    const petition = await prisma.petition.findFirst({
      where: {
        trackingCode,
        applicantEmail: email,
        emailVerifiedAt: {
          not: null,
        },
      },
      select: {
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
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        statusHistory: {
          select: {
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
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
          error:
            "Başvuru bulunamadı. Takip kodu ve e-posta adresini kontrol edin.",
        },
        { status: 404 }
      );
    }

    await prisma.auditLog.create({
      data: {
        actorType: "APPLICANT",
        action: "READ",
        entityType: "PETITION",
        entityId: petition.trackingCode,
        metadata: {
          source: "TRACKING_PAGE",
        },
        ipAddress:
          request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() ||
          request.headers.get("x-real-ip") ||
          undefined,
        userAgent:
          request.headers.get("user-agent") || undefined,
        success: true,
      },
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error(
      "Başvuru takip hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru bilgileri alınırken sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}