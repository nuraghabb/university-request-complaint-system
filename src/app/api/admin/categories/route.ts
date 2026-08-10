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

    const categories = await prisma.category.findMany({
      select: {
        id: true,
        code: true,
        name: true,
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
        categories,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Admin kategori listesi alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Kategoriler alınırken sunucu hatası oluştu.",
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
      description?: unknown;
    };

    if (
      typeof body.code !== "string" ||
      typeof body.name !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Kategori kodu ve adı zorunludur.",
        },
        {
          status: 400,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const code = body.code.trim().toUpperCase();
    const name = body.name.trim();

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

    const existingCategory = await prisma.category.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });

    if (existingCategory) {
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

    const category = await prisma.category.create({
      data: {
        code,
        name,
        description,
        isActive: true,
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

    await prisma.auditLog.create({
      data: {
        actorType: "STAFF",
        staffActorId: adminUser.id,
        action: "CREATE",
        entityType: "CATEGORY",
        entityId: String(category.id),
        newValues: {
          code: category.code,
          name: category.name,
          description: category.description,
          isActive: category.isActive,
        },
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        category,
      },
      {
        status: 201,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Kategori oluşturulamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Kategori oluşturulurken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}