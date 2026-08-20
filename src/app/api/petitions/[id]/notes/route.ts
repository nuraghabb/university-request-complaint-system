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

const MAX_NOTE_LENGTH = 5_000;

async function getAuthenticatedStaff(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const staff = await prisma.staffUser.findUnique({
    where: { id: payload.staffUserId },
    select: { id: true, firstName: true, lastName: true, role: true, unitId: true, isActive: true },
  });
  if (!staff || !staff.isActive) return null;
  return staff;
}

async function checkPetitionAccess(petitionId: number, staffRole: string, staffUnitId: number | null) {
  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { id: true, targetUnitId: true, status: true, emailVerifiedAt: true },
  });
  if (!petition) return { error: "Başvuru bulunamadı.", status: 404 as const };
  if (!petition.emailVerifiedAt || petition.status === "EMAIL_PENDING") {
    return { error: "E-posta doğrulaması tamamlanmamış başvuru.", status: 409 as const };
  }
  if (staffRole !== "ADMIN" && (staffUnitId === null || staffUnitId !== petition.targetUnitId)) {
    return { error: "Bu başvuruya erişim yetkiniz yok.", status: 403 as const };
  }
  return { petition };
}

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

  const access = await checkPetitionAccess(petitionId, staff.role, staff.unitId);
  if ("error" in access) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status, headers: createNoStoreHeaders() });
  }

  try {
    const notes = await prisma.petitionNote.findMany({
      where: { petitionId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, notes }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Notlar alınamadı:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Notlar alınırken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}

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

  const access = await checkPetitionAccess(petitionId, staff.role, staff.unitId);
  if ("error" in access) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status, headers: createNoStoreHeaders() });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Geçersiz JSON verisi." }, { status: 400, headers: createNoStoreHeaders() });
  }

  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).content !== "string") {
    return NextResponse.json({ success: false, error: "İçerik eksik veya geçersiz." }, { status: 400, headers: createNoStoreHeaders() });
  }

  const content = (body as { content: string }).content.trim();
  if (!content) {
    return NextResponse.json({ success: false, error: "Not içeriği boş bırakılamaz." }, { status: 400, headers: createNoStoreHeaders() });
  }
  if (content.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ success: false, error: `Not içeriği en fazla ${MAX_NOTE_LENGTH} karakter olabilir.` }, { status: 400, headers: createNoStoreHeaders() });
  }

  try {
    const note = await prisma.petitionNote.create({
      data: {
        petitionId,
        authorId: staff.id,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    return NextResponse.json({ success: true, note }, { status: 201, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Not eklenemedi:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Not eklenirken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
