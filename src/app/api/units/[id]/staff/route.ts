import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

function parseUnitId(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) return null;
  const unitId = Number(normalizedValue);
  if (!Number.isSafeInteger(unitId) || unitId <= 0) return null;
  return unitId;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getAuthenticatedStaff(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.staffUser.findUnique({
    where: { id: payload.staffUserId },
    select: { id: true, firstName: true, lastName: true, role: true, unitId: true, isActive: true },
  });
}

/**
 * GET: Belirli birimin personellerini listeler.
 * UNIT_MANAGER: Yalnızca kendi birimi. ADMIN: Herhangi bir birim.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const staff = await getAuthenticatedStaff(request);
  if (!staff) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401, headers: createNoStoreHeaders() });
  }

  const { id } = await context.params;
  const unitId = parseUnitId(id);
  if (!unitId) {
    return NextResponse.json({ success: false, error: "Geçersiz birim kimliği." }, { status: 400, headers: createNoStoreHeaders() });
  }

  if (staff.role !== "ADMIN" && staff.role !== "UNIT_MANAGER") {
    return NextResponse.json({ success: false, error: "Bu işlem için yetkiniz bulunmuyor." }, { status: 403, headers: createNoStoreHeaders() });
  }

  if (staff.role === "UNIT_MANAGER" && staff.unitId !== unitId) {
    return NextResponse.json({ success: false, error: "Yalnızca kendi biriminizin personellerini görüntüleyebilirsiniz." }, { status: 403, headers: createNoStoreHeaders() });
  }

  try {
    const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, code: true, name: true, isActive: true } });
    if (!unit) {
      return NextResponse.json({ success: false, error: "Birim bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
    }

    const unitStaff = await prisma.staffUser.findMany({
      where: { unitId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({ success: true, unit, staff: unitStaff }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Birim personelleri alınamadı:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Personeller alınırken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}

/**
 * POST: Birime yeni personel ekler.
 * UNIT_MANAGER: Yalnızca kendi birimi. ADMIN: Herhangi bir birim.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const staff = await getAuthenticatedStaff(request);
  if (!staff) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401, headers: createNoStoreHeaders() });
  }

  const { id } = await context.params;
  const unitId = parseUnitId(id);
  if (!unitId) {
    return NextResponse.json({ success: false, error: "Geçersiz birim kimliği." }, { status: 400, headers: createNoStoreHeaders() });
  }

  if (staff.role !== "ADMIN" && staff.role !== "UNIT_MANAGER") {
    return NextResponse.json({ success: false, error: "Bu işlem için yetkiniz bulunmuyor." }, { status: 403, headers: createNoStoreHeaders() });
  }

  if (staff.role === "UNIT_MANAGER" && staff.unitId !== unitId) {
    return NextResponse.json({ success: false, error: "Yalnızca kendi biriminize personel ekleyebilirsiniz." }, { status: 403, headers: createNoStoreHeaders() });
  }

  try {
    const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, isActive: true } });
    if (!unit || !unit.isActive) {
      return NextResponse.json({ success: false, error: "Birim bulunamadı veya aktif değil." }, { status: 404, headers: createNoStoreHeaders() });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ success: false, error: "Ad, soyad, e-posta ve şifre zorunludur." }, { status: 400, headers: createNoStoreHeaders() });
    }

    const firstName = (body.firstName as string).trim();
    const lastName = (body.lastName as string).trim();
    const email = (body.email as string).trim().toLowerCase();
    const password = body.password as string;
    const role = typeof body.role === "string" && ["UNIT_MANAGER", "UNIT_STAFF"].includes(body.role) ? body.role : "UNIT_STAFF";

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

    const existingUser = await prisma.staffUser.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "Bu e-posta adresi zaten kullanılıyor." }, { status: 409, headers: createNoStoreHeaders() });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newStaff = await prisma.staffUser.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: role as "UNIT_MANAGER" | "UNIT_STAFF",
        unitId,
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
      },
    });

    return NextResponse.json({ success: true, staff: newStaff }, { status: 201, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Birime personel eklenemedi:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Personel eklenirken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
