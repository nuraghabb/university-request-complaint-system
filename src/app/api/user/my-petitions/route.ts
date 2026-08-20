import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

/**
 * Kullanıcının kendi oluşturduğu başvuruları listeler.
 * INTERNAL kullanıcılar: internalUserId veya applicantEmail eşleşmesi
 * STAFF kullanıcılar: applicantEmail eşleşmesi (kendi adına oluşturduğu başvurular)
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Yetkisiz erişim." },
      { status: 401, headers: createNoStoreHeaders() }
    );
  }

  try {
    const whereCondition =
      session.type === "INTERNAL"
        ? {
            OR: [
              { internalUserId: session.user.id },
              { applicantEmail: session.user.email },
            ],
          }
        : {
            applicantEmail: session.user.email,
          };

    const petitions = await prisma.petition.findMany({
      where: whereCondition,
      select: {
        id: true,
        trackingCode: true,
        applicantFirstName: true,
        applicantLastName: true,
        category: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        status: true,
        priority: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
        targetUnit: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      { success: true, petitions },
      { status: 200, headers: createNoStoreHeaders() }
    );
  } catch (error) {
    console.error(
      "Kişisel başvuru listesi alınamadı:",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );
    return NextResponse.json(
      { success: false, error: "Başvurular alınırken sunucu hatası oluştu." },
      { status: 500, headers: createNoStoreHeaders() }
    );
  }
}
