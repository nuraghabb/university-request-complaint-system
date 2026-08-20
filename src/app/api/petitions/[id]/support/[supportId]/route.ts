import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string; supportId: string }>;
}

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

function parseId(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) return null;
  const parsed = Number(normalizedValue);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function getRequestInformation(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

/**
 * PATCH: Admin destek talebini kabul eder (supportUnitId atar) veya red eder.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestInformation = getRequestInformation(request);

  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401, headers: createNoStoreHeaders() });
  }

  const payload = verifyToken(token);
  if (!payload) {
    const response = NextResponse.json({ success: false, error: "Geçersiz veya süresi dolmuş oturum." }, { status: 401, headers: createNoStoreHeaders() });
    response.cookies.set("auth_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires: new Date(0), path: "/" });
    return response;
  }

  const { id, supportId } = await context.params;
  const petitionId = parseId(id);
  const srId = parseId(supportId);

  if (!petitionId || !srId) {
    return NextResponse.json({ success: false, error: "Geçersiz parametre." }, { status: 400, headers: createNoStoreHeaders() });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Geçersiz JSON verisi." }, { status: 400, headers: createNoStoreHeaders() });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Geçersiz veri." }, { status: 400, headers: createNoStoreHeaders() });
  }

  const bodyObj = body as Record<string, unknown>;
  const action = bodyObj.action;

  if (action !== "ACCEPT" && action !== "REJECT") {
    return NextResponse.json({ success: false, error: "İşlem türü geçersiz. ACCEPT veya REJECT olmalı." }, { status: 400, headers: createNoStoreHeaders() });
  }

  if (action === "ACCEPT" && (typeof bodyObj.supportUnitId !== "number" || !Number.isSafeInteger(bodyObj.supportUnitId) || (bodyObj.supportUnitId as number) <= 0)) {
    return NextResponse.json({ success: false, error: "Kabul işlemi için destek birimi seçilmelidir." }, { status: 400, headers: createNoStoreHeaders() });
  }

  try {
    const admin = await prisma.staffUser.findUnique({
      where: { id: payload.staffUserId },
      select: { id: true, role: true, isActive: true },
    });

    if (!admin || !admin.isActive || admin.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Bu işlem için yönetici yetkisi gereklidir." }, { status: 403, headers: createNoStoreHeaders() });
    }

    const supportRequest = await prisma.supportRequest.findUnique({
      where: { id: srId },
      select: { id: true, petitionId: true, status: true },
    });

    if (!supportRequest || supportRequest.petitionId !== petitionId) {
      return NextResponse.json({ success: false, error: "Destek talebi bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
    }

    if (supportRequest.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Bu destek talebi zaten işleme alındı." }, { status: 409, headers: createNoStoreHeaders() });
    }

    if (action === "ACCEPT") {
      const supportUnit = await prisma.unit.findUnique({
        where: { id: bodyObj.supportUnitId as number },
        select: { id: true, isActive: true },
      });

      if (!supportUnit || !supportUnit.isActive) {
        return NextResponse.json({ success: false, error: "Seçilen destek birimi bulunamadı veya aktif değil." }, { status: 404, headers: createNoStoreHeaders() });
      }
    }

    const updated = await prisma.supportRequest.update({
      where: { id: srId },
      data: {
        status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        supportUnitId: action === "ACCEPT" ? (bodyObj.supportUnitId as number) : null,
        resolvedById: admin.id,
        resolvedAt: new Date(),
      },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        supportUnit: { select: { id: true, code: true, name: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ success: true, supportRequest: updated }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Destek talebi güncellenemedi:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Destek talebi güncellenirken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
