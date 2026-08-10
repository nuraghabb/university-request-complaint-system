import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 150;

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

function parseCategoryId(id: string): number | null {
  const categoryId = Number(id);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return null;
  }

  return categoryId;
}

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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
    const categoryId = parseCategoryId(id);

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz kategori kimliği.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const existingCategory = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        {
          success: false,
          error: "Kategori bulunamadı.",
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
      description?: unknown;
      isActive?: unknown;
    };

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : existingCategory.code;

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : existingCategory.name;

    const description =
      body.description === null
        ? null
        : typeof body.description === "string"
          ? body.description.trim() || null
          : existingCategory.description;

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : existingCategory.isActive;

    if (
      !code ||
      code.length > MAX_CODE_LENGTH ||
      !/^[A-Z0-9_]+$/.test(code)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kategori kodu yalnızca büyük harf, rakam ve alt çizgi içerebilir.",
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
          error: "Kategori adı geçersiz.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const duplicateCategory = await prisma.category.findFirst({
      where: {
        code,
        id: {
          not: categoryId,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateCategory) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu kategori kodu zaten kullanılıyor.",
        },
        {
          status: 409,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const updatedCategory = await prisma.$transaction(
      async (transaction) => {
        const category = await transaction.category.update({
          where: {
            id: categoryId,
          },
          data: {
            code,
            name,
            description,
            isActive,
          },
          select: {
            id: true,
            code: true,
            name: true,
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
            entityType: "CATEGORY",
            entityId: String(category.id),
            oldValues: {
              code: existingCategory.code,
              name: existingCategory.name,
              description: existingCategory.description,
              isActive: existingCategory.isActive,
            },
            newValues: {
              code: category.code,
              name: category.name,
              description: category.description,
              isActive: category.isActive,
            },
            success: true,
          },
        });

        return category;
      }
    );

    return NextResponse.json(
      {
        success: true,
        category: updatedCategory,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Kategori güncellenemedi:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Kategori güncellenirken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}