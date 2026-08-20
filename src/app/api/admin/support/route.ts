import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

/**
 * GET: Admin için tüm destek taleplerini listeler.
 * Sadece ADMIN rolü erişebilir.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Yetkisiz erişim." },
      { status: 401, headers: createNoStoreHeaders() }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: "Geçersiz veya süresi dolmuş oturum." },
      { status: 401, headers: createNoStoreHeaders() }
    );
  }

  try {
    const admin = await prisma.staffUser.findUnique({
      where: { id: payload.staffUserId },
      select: { id: true, role: true, isActive: true },
    });

    if (!admin || !admin.isActive || admin.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yönetici yetkisi gereklidir." },
        { status: 403, headers: createNoStoreHeaders() }
      );
    }

    const supportRequests = await prisma.supportRequest.findMany({
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        petition: {
          select: {
            id: true,
            trackingCode: true,
            subject: true,
            status: true,
            targetUnit: { select: { id: true, code: true, name: true } },
            assignedStaff: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        supportUnit: { select: { id: true, code: true, name: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, supportRequests },
      { status: 200, headers: createNoStoreHeaders() }
    );
  } catch (error) {
    console.error(
      "Destek talepleri alınamadı:",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );
    return NextResponse.json(
      { success: false, error: "Destek talepleri alınırken sunucu hatası oluştu." },
      { status: 500, headers: createNoStoreHeaders() }
    );
  }
}
