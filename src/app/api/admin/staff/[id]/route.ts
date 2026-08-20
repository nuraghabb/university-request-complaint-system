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

function parseStaffId(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) return null;
  const staffId = Number(normalizedValue);
  if (!Number.isSafeInteger(staffId) || staffId <= 0) return null;
  return staffId;
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
 * PUT: Personel bilgilerini güncelle.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: "Bu işlem için yönetici yetkisi gereklidir." }, { status: 403, headers: createNoStoreHeaders() });
    }

    const { id } = await context.params;
    const staffId = parseStaffId(id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: "Geçersiz personel kimliği." }, { status: 400, headers: createNoStoreHeaders() });
    }

    const existingStaff = await prisma.staffUser.findUnique({ where: { id: staffId }, select: { id: true } });
    if (!existingStaff) {
      return NextResponse.json({ success: false, error: "Personel bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};

    if (typeof body.firstName === "string") {
      const firstName = body.firstName.trim();
      if (!firstName || firstName.length > 100) {
        return NextResponse.json({ success: false, error: "Ad geçersiz." }, { status: 400, headers: createNoStoreHeaders() });
      }
      updateData.firstName = firstName;
    }

    if (typeof body.lastName === "string") {
      const lastName = body.lastName.trim();
      if (!lastName || lastName.length > 100) {
        return NextResponse.json({ success: false, error: "Soyad geçersiz." }, { status: 400, headers: createNoStoreHeaders() });
      }
      updateData.lastName = lastName;
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!isValidEmail(email)) {
        return NextResponse.json({ success: false, error: "Geçersiz e-posta adresi." }, { status: 400, headers: createNoStoreHeaders() });
      }
      const emailTaken = await prisma.staffUser.findFirst({ where: { email, NOT: { id: staffId } }, select: { id: true } });
      if (emailTaken) {
        return NextResponse.json({ success: false, error: "Bu e-posta adresi zaten kullanılıyor." }, { status: 409, headers: createNoStoreHeaders() });
      }
      updateData.email = email;
    }

    if (typeof body.password === "string" && body.password) {
      if ((body.password as string).length < 6) {
        return NextResponse.json({ success: false, error: "Şifre en az 6 karakter olmalıdır." }, { status: 400, headers: createNoStoreHeaders() });
      }
      updateData.passwordHash = await bcrypt.hash(body.password as string, 12);
    }

    if (typeof body.role === "string") {
      if (!["ADMIN", "UNIT_MANAGER", "UNIT_STAFF"].includes(body.role)) {
        return NextResponse.json({ success: false, error: "Geçersiz rol." }, { status: 400, headers: createNoStoreHeaders() });
      }
      updateData.role = body.role;
    }

    if (body.unitId === null || body.unitId === undefined) {
      updateData.unitId = null;
    } else if (typeof body.unitId === "number" || (typeof body.unitId === "string" && body.unitId)) {
      const unitId = Number(body.unitId);
      if (!Number.isSafeInteger(unitId) || unitId <= 0) {
        return NextResponse.json({ success: false, error: "Geçersiz birim kimliği." }, { status: 400, headers: createNoStoreHeaders() });
      }
      const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, isActive: true } });
      if (!unit || !unit.isActive) {
        return NextResponse.json({ success: false, error: "Seçilen birim bulunamadı veya aktif değil." }, { status: 404, headers: createNoStoreHeaders() });
      }
      updateData.unitId = unitId;
    }

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "Güncellenecek veri belirtilmedi." }, { status: 400, headers: createNoStoreHeaders() });
    }

    const updatedStaff = await prisma.staffUser.update({
      where: { id: staffId },
      data: updateData,
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

    return NextResponse.json({ success: true, staff: updatedStaff }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Personel güncellenemedi:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Personel güncellenirken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}

/**
 * DELETE: Personeli pasifleştir (soft delete).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: "Bu işlem için yönetici yetkisi gereklidir." }, { status: 403, headers: createNoStoreHeaders() });
    }

    const { id } = await context.params;
    const staffId = parseStaffId(id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: "Geçersiz personel kimliği." }, { status: 400, headers: createNoStoreHeaders() });
    }

    if (adminUser.id === staffId) {
      return NextResponse.json({ success: false, error: "Kendi hesabınızı silemezsiniz." }, { status: 409, headers: createNoStoreHeaders() });
    }

    const existingStaff = await prisma.staffUser.findUnique({ where: { id: staffId }, select: { id: true, isActive: true } });
    if (!existingStaff) {
      return NextResponse.json({ success: false, error: "Personel bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
    }

    await prisma.staffUser.update({ where: { id: staffId }, data: { isActive: false } });

    return NextResponse.json({ success: true, message: "Personel başarıyla pasif duruma alındı." }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Personel silinemedi:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Personel silinirken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
