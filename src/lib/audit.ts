import { getPrismaClient } from "@/lib/prisma";
import { AuditActorType, AuditAction } from "@prisma/client";

interface AuditLogParams {
  actor: AuditActorType;
  staffActorId?: number;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * İşlem günlüğü oluşturur
 * Tüm kritik işlemleri kaydeder: giriş, başvuru oluşturma, atama, cevaplama, vb.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.auditLog.create({
      data: {
        actorType: params.actor,
        staffActorId: params.staffActorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : undefined,
        newValues: params.newValues ? JSON.stringify(params.newValues) : undefined,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: params.success ?? true,
        errorMessage: params.errorMessage,
      },
    });
  } catch (error) {
    console.error("❌ Audit log error:", error);
    // Audit log hatası uygulamayı kesintiye uğratmamalı
  }
}

/**
 * İç kullanıcı giriş işlemini loglar
 */
export async function logInternalUserLogin(
  userId: number,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    actor: "APPLICANT",
    action: "LOGIN",
    entityType: "InternalUser",
    entityId: String(userId),
    metadata: { email },
    ipAddress,
    userAgent,
  });
}

/**
 * Personel giriş işlemini loglar
 */
export async function logStaffLogin(
  staffId: number,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    actor: "STAFF",
    staffActorId: staffId,
    action: "LOGIN",
    entityType: "StaffUser",
    entityId: String(staffId),
    metadata: { email },
    ipAddress,
    userAgent,
  });
}

/**
 * Başvuru oluşturmayı loglar
 */
export async function logPetitionCreated(
  petitionId: number,
  applicantEmail: string,
  category: string,
  targetUnit: string
): Promise<void> {
  await createAuditLog({
    actor: "APPLICANT",
    action: "CREATE",
    entityType: "Petition",
    entityId: String(petitionId),
    newValues: {
      applicantEmail,
      category,
      targetUnit,
    },
  });
}

/**
 * Başvuruya atama işlemini loglar
 */
export async function logPetitionAssigned(
  petitionId: number,
  staffId: number,
  fromUnit: string,
  toUnit: string,
  note?: string
): Promise<void> {
  await createAuditLog({
    actor: "STAFF",
    staffActorId: staffId,
    action: "ASSIGN",
    entityType: "Petition",
    entityId: String(petitionId),
    metadata: {
      fromUnit,
      toUnit,
      note,
    },
  });
}

/**
 * Başvuruya cevap yazmasını loglar
 */
export async function logPetitionResponded(
  petitionId: number,
  staffId: number,
  responseLength: number,
  isInternal: boolean
): Promise<void> {
  await createAuditLog({
    actor: "STAFF",
    staffActorId: staffId,
    action: "RESPOND",
    entityType: "Petition",
    entityId: String(petitionId),
    metadata: {
      responseLength,
      isInternal,
    },
  });
}

/**
 * Başvuru durumu değişikliğini loglar
 */
export async function logPetitionStatusChanged(
  petitionId: number,
  staffId: number,
  fromStatus: string,
  toStatus: string,
  reason?: string
): Promise<void> {
  await createAuditLog({
    actor: "STAFF",
    staffActorId: staffId,
    action: "STATUS_CHANGE",
    entityType: "Petition",
    entityId: String(petitionId),
    metadata: {
      fromStatus,
      toStatus,
      reason,
    },
  });
}

/**
 * Başvuru kapatmasını loglar
 */
export async function logPetitionClosed(
  petitionId: number,
  staffId: number,
  reason: string
): Promise<void> {
  await createAuditLog({
    actor: "STAFF",
    staffActorId: staffId,
    action: "CLOSE",
    entityType: "Petition",
    entityId: String(petitionId),
    metadata: { reason },
  });
}
