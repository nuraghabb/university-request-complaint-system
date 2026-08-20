import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string; staffId: string }>;
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
 * DELETE: Birimden personeli kaldırır (unitId = null yapar veya pasifleştirir).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const staff = await getAuthenticatedStaff(request);
  if (!staff) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401, headers: createNoStoreHeaders() });
  }

  const { id, staffId } = await context.params;
  const unitId = parseId(id);
  const targetStaffId = parseId(staffId);

  if (!unitId || !targetStaffId) {
    return NextResponse.json({ success: false, error: "Geçersiz parametre." }, { status: 400, headers: createNoStoreHeaders() });
  }

  if (staff.role !== "ADMIN" && staff.role !== "UNIT_MANAGER") {
    return NextResponse.json({ success: false, error: "Bu işlem için yetkiniz bulunmuyor." }, { status: 403, headers: createNoStoreHeaders() });
  }

  if (staff.role === "UNIT_MANAGER" && staff.unitId !== unitId) {
    return NextResponse.json({ success: false, error: "Yalnızca kendi biriminizden personel kaldırabilirsiniz." }, { status: 403, headers: createNoStoreHeaders() });
  }

  try {
    const targetStaff = await prisma.staffUser.findUnique({
      where: { id: targetStaffId },
      select: { id: true, unitId: true, role: true, firstName: true, lastName: true, isActive: true },
    });

    if (!targetStaff) {
      return NextResponse.json({ success: false, error: "Personel bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
    }

    if (targetStaff.unitId !== unitId) {
      return NextResponse.json({ success: false, error: "Bu personel belirtilen birime ait değil." }, { status: 400, headers: createNoStoreHeaders() });
    }

    const hasActivePetitions = await prisma.petition.findFirst({
      where: {
        assignedStaffId: targetStaffId,
        status: { notIn: ["CLOSED", "REJECTED"] },
      },
      select: { id: true },
    });

    if (hasActivePetitions) {
      return NextResponse.json({ success: false, error: `${targetStaff.firstName} ${targetStaff.lastName} aktif bir görevde bulunduğu için kaldırılamaz. Önce görevleri_transfer edilmelidir.` }, { status: 409, headers: createNoStoreHeaders() });
    }

    await prisma.staffUser.update({
      where: { id: targetStaffId },
      data: { unitId: null },
    });

    return NextResponse.json({ success: true, message: `${targetStaff.firstName} ${targetStaff.lastName} başarıyla birimden kaldırıldı.` }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Personel kaldırılamadı:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Personel kaldırılırken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
