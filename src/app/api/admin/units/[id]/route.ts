import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 255;

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

async function getAdminUser(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  return prisma.staffUser.findFirst({
    where: {
      id: payload.staffUserId,
      role: "ADMIN",
      isActive: true,
    },
    select: {
      id: true,
    },
  });
}

function parseUnitId(id: string): number | null {
  const unitId = Number(id);

  if (!Number.isInteger(unitId) || unitId <= 0) {
    return null;
  }

  return unitId;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu işlem için yönetici yetkisi gereklidir.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const { id } = await context.params;

    const unitId = parseUnitId(id);

    if (!unitId) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz birim kimliği.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const existingUnit = await prisma.unit.findUnique({
      where: {
        id: unitId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        description: true,
        isActive: true,
      },
    });

    if (!existingUnit) {
      return NextResponse.json(
        {
          success: false,
          error: "Birim bulunamadı.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const body = (await request.json()) as {
      code?: unknown;
      name?: unknown;
      email?: unknown;
      description?: unknown;
      isActive?: unknown;
    };

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : existingUnit.code;

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : existingUnit.name;

    const email =
      body.email === null
        ? null
        : typeof body.email === "string"
          ? body.email.trim().toLowerCase() || null
          : existingUnit.email;

    const description =
      body.description === null
        ? null
        : typeof body.description === "string"
          ? body.description.trim() || null
          : existingUnit.description;

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : existingUnit.isActive;

    if (
      !code ||
      code.length > MAX_CODE_LENGTH ||
      !/^[A-Z0-9_]+$/.test(code)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Birim kodu yalnızca büyük harf, rakam ve alt çizgi içerebilir.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (!name || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: "Birim adı geçersiz.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      email &&
      (email.length > MAX_EMAIL_LENGTH ||
        !isValidEmail(email))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Birim e-posta adresi geçersiz.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const duplicateUnit = await prisma.unit.findFirst({
      where: {
        code,
        id: {
          not: unitId,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateUnit) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu birim kodu zaten kullanılıyor.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const updatedUnit = await prisma.$transaction(
      async (transaction) => {
        const unit = await transaction.unit.update({
          where: {
            id: unitId,
          },
          data: {
            code,
            name,
            email,
            description,
            isActive,
          },
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: "STAFF",
            staffActorId: adminUser.id,
            action: "UPDATE",
            entityType: "UNIT",
            entityId: String(unit.id),
            oldValues: {
              code: existingUnit.code,
              name: existingUnit.name,
              email: existingUnit.email,
              description: existingUnit.description,
              isActive: existingUnit.isActive,
            },
            newValues: {
              code: unit.code,
              name: unit.name,
              email: unit.email,
              description: unit.description,
              isActive: unit.isActive,
            },
            success: true,
          },
        });

        return unit;
      }
    );

    return NextResponse.json(
      {
        success: true,
        unit: updatedUnit,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Birim güncellenemedi:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Birim güncellenirken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}