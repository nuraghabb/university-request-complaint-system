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

function getRequestInformation(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

/**
 * Boş bir görevi birim personeli üstlenebilir.
 * Şartlar: assignedStaffId null, status RECEIVED, aynı birim.
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;
  const petitionId = parsePetitionId(id);
  if (!petitionId) {
    return NextResponse.json({ success: false, error: "Geçersiz başvuru kimliği." }, { status: 400, headers: createNoStoreHeaders() });
  }

  try {
    const currentStaff = await prisma.staffUser.findUnique({
      where: { id: payload.staffUserId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, unitId: true, isActive: true },
    });

    if (!currentStaff || !currentStaff.isActive) {
      return NextResponse.json({ success: false, error: "Personel hesabı bulunamadı veya pasif durumda." }, { status: 403, headers: createNoStoreHeaders() });
    }

    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: { id: true, trackingCode: true, subject: true, status: true, targetUnitId: true, assignedStaffId: true, emailVerifiedAt: true },
    });

    if (!petition) {
      return NextResponse.json({ success: false, error: "Başvuru bulunamadı." }, { status: 404, headers: createNoStoreHeaders() });
    }

    if (!petition.emailVerifiedAt || petition.status === "EMAIL_PENDING") {
      return NextResponse.json({ success: false, error: "E-posta doğrulaması tamamlanmamış başvurular üstlenilemez." }, { status: 409, headers: createNoStoreHeaders() });
    }

    if (petition.status === "CLOSED" || petition.status === "REJECTED") {
      return NextResponse.json({ success: false, error: "Kapatılmış veya reddedilmiş başvurular üstlenilemez." }, { status: 409, headers: createNoStoreHeaders() });
    }

    if (currentStaff.unitId !== petition.targetUnitId) {
      return NextResponse.json({ success: false, error: "Yalnızca kendi biriminize ait başvuruları üstlenebilirsiniz." }, { status: 403, headers: createNoStoreHeaders() });
    }

    if (petition.assignedStaffId !== null) {
      return NextResponse.json({ success: false, error: "Bu başvuru zaten bir personele atanmış." }, { status: 409, headers: createNoStoreHeaders() });
    }

    const previousStatus = petition.status;
    const claimDate = new Date();

    const updatedPetition = await prisma.$transaction(async (transaction) => {
      await transaction.petitionAssignment.create({
        data: {
          petitionId,
          fromUnitId: petition.targetUnitId,
          toUnitId: petition.targetUnitId,
          assignedToId: currentStaff.id,
          assignedById: currentStaff.id,
          note: "Görev personel tarafından üstlenildi.",
        },
      });

      const updated = await transaction.petition.update({
        where: { id: petitionId },
        data: { assignedStaffId: currentStaff.id, status: "ASSIGNED" },
        select: {
          id: true, trackingCode: true, subject: true, status: true, priority: true, updatedAt: true,
          targetUnit: { select: { id: true, code: true, name: true } },
          assignedStaff: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await transaction.petitionStatusHistory.create({
        data: {
          petitionId,
          fromStatus: previousStatus,
          toStatus: "ASSIGNED",
          changedById: currentStaff.id,
          note: `${currentStaff.firstName} ${currentStaff.lastName} tarafından üstlenildi.`,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "STAFF",
          staffActorId: currentStaff.id,
          action: "ASSIGN",
          entityType: "PETITION",
          entityId: String(petitionId),
          oldValues: { assignedStaffId: null, status: previousStatus },
          newValues: { assignedStaffId: currentStaff.id, status: "ASSIGNED" },
          metadata: { targetUnitId: petition.targetUnitId, type: "SELF_CLAIM" },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: true,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, message: "Görev başarıyla üstlenildi.", petition: updatedPetition }, { status: 200, headers: createNoStoreHeaders() });
  } catch (error) {
    console.error("Görev üstlenme hatası:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ success: false, error: "Görev üstlenilirken sunucu hatası oluştu." }, { status: 500, headers: createNoStoreHeaders() });
  }
}
