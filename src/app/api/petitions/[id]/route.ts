import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface RequestInformation {
  ipAddress?: string;
  userAgent?: string;
}

function getRequestInformation(
  request: NextRequest
): RequestInformation {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    ipAddress:
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent:
      request.headers.get("user-agent") || undefined,
  };
}

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

function parsePetitionId(value: string): number | null {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const petitionId = Number(normalizedValue);

  if (
    !Number.isSafeInteger(petitionId) ||
    petitionId <= 0
  ) {
    return null;
  }

  return petitionId;
}

/**
 * Yetkili kurum personelinin tek bir başvurunun
 * ayrıntılarını görüntülemesini sağlar.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const requestInformation =
    getRequestInformation(request);

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "Yetkisiz erişim.",
      },
      {
        status: 401,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz veya süresi dolmuş oturum.",
      },
      {
        status: 401,
        headers: createNoStoreHeaders(),
      }
    );
  }

  const { id } = await context.params;
  const petitionId = parsePetitionId(id);

  if (!petitionId) {
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz başvuru kimliği.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  try {
    const staffUser = await prisma.staffUser.findUnique({
      where: {
        id: payload.staffUserId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        unitId: true,
        isActive: true,
        unit: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!staffUser || !staffUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Yetkili personel hesabı bulunamadı.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const petitionAccessInformation =
      await prisma.petition.findUnique({
        where: {
          id: petitionId,
        },
        select: {
          id: true,
          targetUnitId: true,
          createdByStaffId: true,
          emailVerifiedAt: true,
          status: true,
        },
      });

    if (!petitionAccessInformation) {
      return NextResponse.json(
        {
          success: false,
          error: "Başvuru bulunamadı.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const canAccessPetition =
      staffUser.role === "ADMIN" ||
      (staffUser.unitId !== null &&
        staffUser.unitId ===
          petitionAccessInformation.targetUnitId) ||
      petitionAccessInformation.createdByStaffId ===
        staffUser.id;

    if (!canAccessPetition) {
      await prisma.auditLog.create({
        data: {
          actorType: "STAFF",
          staffActorId: staffUser.id,
          action: "READ",
          entityType: "PETITION",
          entityId: String(petitionId),
          metadata: {
            denied: true,
            reason: "UNIT_ACCESS_DENIED",
            staffRole: staffUser.role,
            staffUnitId: staffUser.unitId,
            petitionTargetUnitId:
              petitionAccessInformation.targetUnitId,
          },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: false,
          errorMessage:
            "Personel, yetkili olmadığı birime ait başvuruyu görüntülemeye çalıştı.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Bu başvuruyu görüntüleme yetkiniz bulunmuyor.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      !petitionAccessInformation.emailVerifiedAt ||
      petitionAccessInformation.status === "EMAIL_PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulaması tamamlanmamış başvurular görüntülenemez.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const petition = await prisma.petition.findUnique({
      where: {
        id: petitionId,
      },
      select: {
        id: true,
        trackingCode: true,

        applicantFirstName: true,
        applicantLastName: true,
        applicantEmail: true,
        applicantPhone: true,

        identityVerifiedAt: true,
        botCheckVerifiedAt: true,
        privacyNoticeVersion: true,
        privacyNoticeAcknowledgedAt: true,
        emailVerifiedAt: true,

        category: true,
        subject: true,
        content: true,
        status: true,
        priority: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,

        targetUnit: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            isActive: true,
          },
        },

        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            unit: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },

        attachments: {
          select: {
            id: true,
            originalName: true,
            storageKey: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        assignments: {
          select: {
            id: true,
            note: true,
            createdAt: true,
            endedAt: true,

            fromUnit: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            toUnit: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },

            assignedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },

        responses: {
          select: {
            id: true,
            content: true,
            visibility: true,
            isFinal: true,
            createdAt: true,
            updatedAt: true,

            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                unit: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,

            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        notes: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        supportRequests: {
          select: {
            id: true,
            message: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
            requestedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            supportUnit: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            resolvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!petition) {
      return NextResponse.json(
        {
          success: false,
          error: "Başvuru bulunamadı.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    await prisma.auditLog.create({
      data: {
        actorType: "STAFF",
        staffActorId: staffUser.id,
        action: "READ",
        entityType: "PETITION",
        entityId: String(petition.id),
        metadata: {
          trackingCode: petition.trackingCode,
          staffRole: staffUser.role,
          staffUnitId: staffUser.unitId,
        },
        ipAddress: requestInformation.ipAddress,
        userAgent: requestInformation.userAgent,
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        petition,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Başvuru ayrıntısı alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru ayrıntıları alınırken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}

type PetitionStatus =
  | "EMAIL_PENDING"
  | "RECEIVED"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "FORWARDED"
  | "ANSWERED"
  | "CLOSED"
  | "REJECTED";

type PetitionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface UpdatePetitionBody {
  priority?: PetitionPriority;
  status?: PetitionStatus;
  assignedStaffId?: number | null;
  note?: string;
}

const ALLOWED_PRIORITIES: readonly string[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const ALLOWED_STATUSES: readonly string[] = ["RECEIVED", "IN_REVIEW", "ASSIGNED", "FORWARDED", "ANSWERED", "CLOSED", "REJECTED"];

/**
 * Tek endpoint ile öncelik, durum ve personel atamasını günceller.
 * ADMIN: Tüm başvurularda tüm alanları düzenleyebilir.
 * UNIT_MANAGER: Kendi birimi başvurularında düzenleyebilir.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const requestInformation = getRequestInformation(request);

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Yetkisiz erişim." },
      { status: 401, headers: createNoStoreHeaders() }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    const response = NextResponse.json(
      { success: false, error: "Geçersiz veya süresi dolmuş oturum." },
      { status: 401, headers: createNoStoreHeaders() }
    );
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });
    return response;
  }

  const { id } = await context.params;
  const petitionId = parsePetitionId(id);

  if (!petitionId) {
    return NextResponse.json(
      { success: false, error: "Geçersiz başvuru kimliği." },
      { status: 400, headers: createNoStoreHeaders() }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Geçersiz JSON verisi." },
      { status: 400, headers: createNoStoreHeaders() }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Geçersiz veri." },
      { status: 400, headers: createNoStoreHeaders() }
    );
  }

  const updateBody = body as UpdatePetitionBody;

  const hasPriority =
    updateBody.priority !== undefined &&
    typeof updateBody.priority === "string";
  const hasStatus =
    updateBody.status !== undefined &&
    typeof updateBody.status === "string";
  const hasAssign =
    updateBody.assignedStaffId !== undefined;

  if (!hasPriority && !hasStatus && !hasAssign) {
    return NextResponse.json(
      { success: false, error: "Güncellenecek alan belirtilmedi (priority, status veya assignedStaffId)." },
      { status: 400, headers: createNoStoreHeaders() }
    );
  }

  if (hasPriority && !ALLOWED_PRIORITIES.includes(updateBody.priority!)) {
    return NextResponse.json(
      { success: false, error: "Geçersiz öncelik değeri." },
      { status: 400, headers: createNoStoreHeaders() }
    );
  }

  if (hasStatus && !ALLOWED_STATUSES.includes(updateBody.status!)) {
    return NextResponse.json(
      { success: false, error: "Geçersiz durum değeri." },
      { status: 400, headers: createNoStoreHeaders() }
    );
  }

  const note = typeof updateBody.note === "string" ? updateBody.note.trim() || undefined : undefined;

  try {
    const currentStaff = await prisma.staffUser.findUnique({
      where: { id: payload.staffUserId },
      select: { id: true, firstName: true, lastName: true, role: true, unitId: true, isActive: true },
    });

    if (!currentStaff || !currentStaff.isActive) {
      return NextResponse.json(
        { success: false, error: "Personel hesabı bulunamadı veya pasif durumda." },
        { status: 403, headers: createNoStoreHeaders() }
      );
    }

    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: {
        id: true, trackingCode: true, subject: true, status: true, priority: true,
        targetUnitId: true, assignedStaffId: true, emailVerifiedAt: true,
      },
    });

    if (!petition) {
      return NextResponse.json(
        { success: false, error: "Başvuru bulunamadı." },
        { status: 404, headers: createNoStoreHeaders() }
      );
    }

    const isAdmin = currentStaff.role === "ADMIN";
    const isUnitManagerWithAccess =
      currentStaff.role === "UNIT_MANAGER" &&
      currentStaff.unitId !== null &&
      currentStaff.unitId === petition.targetUnitId;

    if (!isAdmin && !isUnitManagerWithAccess) {
      return NextResponse.json(
        { success: false, error: "Bu başvuruyu güncelleme yetkiniz bulunmuyor." },
        { status: 403, headers: createNoStoreHeaders() }
      );
    }

    if (!petition.emailVerifiedAt || petition.status === "EMAIL_PENDING") {
      return NextResponse.json(
        { success: false, error: "E-posta doğrulaması tamamlanmamış başvurular güncellenemez." },
        { status: 409, headers: createNoStoreHeaders() }
      );
    }

    if (petition.status === "CLOSED" || petition.status === "REJECTED") {
      return NextResponse.json(
        { success: false, error: "Kapatılmış veya reddedilmiş başvurular güncellenemez." },
        { status: 409, headers: createNoStoreHeaders() }
      );
    }

    const previousStatus = petition.status;
    const previousPriority = petition.priority;

    const updatedPetition = await prisma.$transaction(async (transaction) => {
      const dataToUpdate: Record<string, unknown> = {};

      if (hasPriority && updateBody.priority !== petition.priority) {
        dataToUpdate.priority = updateBody.priority;
      }

      if (hasStatus && updateBody.status !== petition.status) {
        dataToUpdate.status = updateBody.status;
      }

      if (hasAssign) {
        if (updateBody.assignedStaffId === null) {
          dataToUpdate.assignedStaffId = null;
          dataToUpdate.status = "RECEIVED";
        } else if (typeof updateBody.assignedStaffId === "number" && updateBody.assignedStaffId !== petition.assignedStaffId) {
          const assignedStaff = await transaction.staffUser.findUnique({
            where: { id: updateBody.assignedStaffId },
            select: { id: true, firstName: true, lastName: true, unitId: true, isActive: true },
          });

          if (!assignedStaff || !assignedStaff.isActive) {
            throw new Error("Atanacak personel bulunamadı veya pasif.");
          }

          if (assignedStaff.unitId !== petition.targetUnitId) {
            throw new Error("Personel aynı birimde olmalı.");
          }

          dataToUpdate.assignedStaffId = assignedStaff.id;
          dataToUpdate.status = "ASSIGNED";

          await transaction.petitionAssignment.updateMany({
            where: { petitionId, endedAt: null },
            data: { endedAt: new Date() },
          });

          await transaction.petitionAssignment.create({
            data: {
              petitionId,
              fromUnitId: petition.targetUnitId,
              toUnitId: petition.targetUnitId,
              assignedToId: assignedStaff.id,
              assignedById: currentStaff.id,
              note: note || `${assignedStaff.firstName} ${assignedStaff.lastName} personeline atandı.`,
            },
          });
        }
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return {
          id: petition.id,
          trackingCode: petition.trackingCode,
          status: petition.status,
          priority: petition.priority,
          updatedAt: new Date().toISOString(),
        };
      }

      const updated = await transaction.petition.update({
        where: { id: petitionId },
        data: dataToUpdate,
        select: {
          id: true, trackingCode: true, status: true, priority: true, updatedAt: true,
          targetUnit: { select: { id: true, code: true, name: true } },
          assignedStaff: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const changes: string[] = [];
      if (hasPriority && updateBody.priority !== previousPriority) changes.push(`öncelik: ${previousPriority} → ${updateBody.priority}`);
      if (hasStatus && updateBody.status !== previousStatus) changes.push(`durum: ${previousStatus} → ${updateBody.status}`);
      if (hasAssign) changes.push("personel ataması güncellendi");

      await transaction.petitionStatusHistory.create({
        data: {
          petitionId,
          fromStatus: previousStatus,
          toStatus: (dataToUpdate.status as PetitionStatus) || previousStatus,
          changedById: currentStaff.id,
          note: note || changes.join(", ") || "Başvuru güncellendi.",
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "STAFF",
          staffActorId: currentStaff.id,
          action: "UPDATE",
          entityType: "PETITION",
          entityId: String(petitionId),
          oldValues: { status: previousStatus, priority: previousPriority, assignedStaffId: petition.assignedStaffId },
          newValues: JSON.parse(JSON.stringify(dataToUpdate)),
          metadata: { trackingCode: petition.trackingCode, changes },
          ipAddress: requestInformation.ipAddress,
          userAgent: requestInformation.userAgent,
          success: true,
        },
      });

      return updated;
    });

    return NextResponse.json(
      { success: true, message: "Başvuru başarıyla güncellendi.", petition: updatedPetition },
      { status: 200, headers: createNoStoreHeaders() }
    );
  } catch (error) {
    console.error("Başvuru güncelleme hatası:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Başvuru güncellenirken sunucu hatası oluştu." },
      { status: 500, headers: createNoStoreHeaders() }
    );
  }
}