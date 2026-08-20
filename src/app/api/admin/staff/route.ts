import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

async function getAdminUser(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.staffUser.findFirst({
    where: { id: payload.staffUserId, role: "ADMIN", isActive: true },
    select: { id: true },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * GET: Tüm personelleri listeler (filtrelenebilir).
 * Query params: unitId, role, search
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: "Bu işlem için yönetici yetkisi gereklidir." }, { status: 403, headers: createNoStoreHeaders() });
    }

    const params = request.nextUrl.searchParams;
    const unitIdParam = params.get("unitId");
    const roleParam = params.get("role");
    const searchParam = params.get("search");

    const where: Record<string, unknown> = {};

    if (unitIdParam) {
      const unitId = Number(unitIdParam);
      if (Number.isSafeInteger(unitId) && unitId > 0) {
        where.unitId = unitId;
      }
    }

    if (roleParam && ["ADMIN", "UNIT_MANAGER", "UNIT_STAFF"].includes(roleParam)) {
      where.role = roleParam;
    }

    if (searchParam && searchParam.trim()) {
      const search = searchParam.trim();
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const staff = await prisma.staffUser.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        unit: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({ success: true, staff }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Personel listesi alınamadı:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Personeller alınırken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}

/**
 * POST: Yeni personel oluşturur.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: "Bu işlem için yönetici yetkisi gereklidir." }, { status: 403, headers: createNoStoreHeaders() });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.email !== "string" || typeof body.password !== "string" || typeof body.role !== "string") {
      return NextResponse.json({ success: false, error: "Ad, soyad, e-posta, şifre ve rol zorunludur." }, { status: 400, headers: createNoStoreHeaders() });
    }

    const firstName = (body.firstName as string).trim();
    const lastName = (body.lastName as string).trim();
    const email = (body.email as string).trim().toLowerCase();
    const password = body.password as string;
    const role = body.role as string;
    const unitId = typeof body.unitId === "number" ? body.unitId : typeof body.unitId === "string" && body.unitId ? Number(body.unitId) : null;

    if (!firstName || firstName.length > 100) {
      return NextResponse.json({ success: false, error: "Ad geçersiz." }, { status: 400, headers: createNoStoreHeaders() });
    }
    if (!lastName || lastName.length > 100) {
      return NextResponse.json({ success: false, error: "Soyad geçersiz." }, { status: 400, headers: createNoStoreHeaders() });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Geçersiz e-posta adresi." }, { status: 400, headers: createNoStoreHeaders() });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Şifre en az 6 karakter olmalıdır." }, { status: 400, headers: createNoStoreHeaders() });
    }
    if (!["ADMIN", "UNIT_MANAGER", "UNIT_STAFF"].includes(role)) {
      return NextResponse.json({ success: false, error: "Geçersiz rol." }, { status: 400, headers: createNoStoreHeaders() });
    }
    if (unitId !== null && (!Number.isSafeInteger(unitId) || unitId <= 0)) {
      return NextResponse.json({ success: false, error: "Geçersiz birim kimliği." }, { status: 400, headers: createNoStoreHeaders() });
    }

    const existingUser = await prisma.staffUser.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "Bu e-posta adresi zaten kullanılıyor." }, { status: 409, headers: createNoStoreHeaders() });
    }

    if (unitId !== null) {
      const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, isActive: true } });
      if (!unit || !unit.isActive) {
        return NextResponse.json({ success: false, error: "Seçilen birim bulunamadı veya aktif değil." }, { status: 404, headers: createNoStoreHeaders() });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newStaff = await prisma.staffUser.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: role as "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF",
        unitId: unitId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        unit: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, staff: newStaff }, { status: 201, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Personel oluşturulamadı:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Personel oluşturulurken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
