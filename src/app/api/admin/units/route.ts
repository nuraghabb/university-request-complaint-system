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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: NextRequest) {
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

    const units = await prisma.unit.findMany({
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
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        units,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Admin birim listesi alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Birimler alınırken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as {
      code?: unknown;
      name?: unknown;
      email?: unknown;
      description?: unknown;
    };

    if (
      typeof body.code !== "string" ||
      typeof body.name !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Birim kodu ve adı zorunludur.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const code = body.code.trim().toUpperCase();
    const name = body.name.trim();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase() || null
        : null;

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

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

    const existingUnit = await prisma.unit.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });

    if (existingUnit) {
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

    const unit = await prisma.$transaction(
      async (transaction) => {
        const createdUnit = await transaction.unit.create({
          data: {
            code,
            name,
            email,
            description,
            isActive: true,
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
            action: "CREATE",
            entityType: "UNIT",
            entityId: String(createdUnit.id),
            newValues: {
              code: createdUnit.code,
              name: createdUnit.name,
              email: createdUnit.email,
              description: createdUnit.description,
              isActive: createdUnit.isActive,
            },
            success: true,
          },
        });

        return createdUnit;
      }
    );

    return NextResponse.json(
      {
        success: true,
        unit,
      },
      {
        status: 201,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Birim oluşturulamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Birim oluşturulurken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}