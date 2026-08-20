import { NextRequest, NextResponse } from "next/server";

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

function parsePetitionId(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) return null;
  const petitionId = Number(normalizedValue);
  if (!Number.isSafeInteger(petitionId) || petitionId <= 0) return null;
  return petitionId;
}

const MAX_MESSAGE_LENGTH = 5_000;

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
 * GET: Destek taleplerini listeler.
 * ADMIN: Tüm talepler. Birim personeli: Kendi birimiyle ilgili talepler.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const staff = await getAuthenticatedStaff(request);
  if (!staff) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401, headers: createNoStoreHeaders() });
  }

  const { id } = await context.params;
  const petitionId = parsePetitionId(id);
  if (!petitionId) {
    return NextResponse.json({ success: false, error: "Geçersiz başvuru kimliği." }, { status: 400, headers: createNoStoreHeaders() });
  }

  try {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: { id: true, targetUnitId: true },
    });

    if (!petition) {
      return NextResponse.json({ success: false, error: "Başvuru bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
    }

    const isAdmin = staff.role === "ADMIN";
    const isSameUnit = staff.unitId === petition.targetUnitId;

    if (!isAdmin && !isSameUnit) {
      return NextResponse.json({ success: false, error: "Bu başvuruya erişim yetkiniz yok." }, { status: 403, headers: createNoStoreHeaders() });
    }

    const supportRequests = await prisma.supportRequest.findMany({
      where: { petitionId },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        supportUnit: { select: { id: true, code: true, name: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, supportRequests }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Destek talepleri alınamadı:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Destek talepleri alınırken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}

/**
 * POST: Birim personeli admin'e destek talebi oluşturur.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const staff = await getAuthenticatedStaff(request);
  if (!staff) {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401, headers: createNoStoreHeaders() });
  }

  const { id } = await context.params;
  const petitionId = parsePetitionId(id);
  if (!petitionId) {
    return NextResponse.json({ success: false, error: "Geçersiz başvuru kimliği." }, { status: 400, headers: createNoStoreHeaders() });
  }

  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { id: true, targetUnitId: true, status: true, emailVerifiedAt: true },
  });

  if (!petition) {
    return NextResponse.json({ success: false, error: "Başvuru bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
  }

  if (!petition.emailVerifiedAt || petition.status === "EMAIL_PENDING") {
    return NextResponse.json({ success: false, error: "E-posta doğrulaması tamamlanmamış başvurular için destek talebi oluşturulamaz." }, { status: 409, headers: createNoStoreHeaders() });
  }

  if (staff.unitId !== petition.targetUnitId) {
    return NextResponse.json({ success: false, error: "Yalnızca kendi biriminize ait başvurular için destek talebi oluşturabilirsiniz." }, { status: 403, headers: createNoStoreHeaders() });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Geçersiz JSON verisi." }, { status: 400, headers: createNoStoreHeaders() });
  }

  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).message !== "string") {
    return NextResponse.json({ success: false, error: "Mesaj eksik veya geçersiz." }, { status: 400, headers: createNoStoreHeaders() });
  }

  const message = (body as { message: string }).message.trim();
  if (!message) {
    return NextResponse.json({ success: false, error: "Destek talebi mesajı boş bırakılamaz." }, { status: 400, headers: createNoStoreHeaders() });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ success: false, error: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.` }, { status: 400, headers: createNoStoreHeaders() });
  }

  try {
    const supportRequest = await prisma.supportRequest.create({
      data: {
        petitionId,
        requestedById: staff.id,
        message,
      },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, supportRequest }, { status: 201, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Destek talebi oluşturulamadı:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Destek talebi oluşturulurken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
