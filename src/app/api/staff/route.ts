import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

function parseUnitId(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const unitId = Number(normalizedValue);

  if (!Number.isSafeInteger(unitId) || unitId <= 0) {
    return null;
  }

  return unitId;
}

/**
 * Belirli bir birimdeki aktif personelleri listeler.
 *
 * Yetkiler:
 * - ADMIN: Aktif herhangi bir birimin personellerini görebilir.
 * - UNIT_MANAGER: Yalnızca kendi biriminin personellerini görebilir.
 */
export async function GET(request: NextRequest) {
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
    const response = NextResponse.json(
      {
        success: false,
        error: "Geçersiz veya süresi dolmuş oturum.",
      },
      {
        status: 401,
        headers: createNoStoreHeaders(),
      }
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

  const requestedUnitId = parseUnitId(
    request.nextUrl.searchParams.get("unitId")
  );

  if (!requestedUnitId) {
    return NextResponse.json(
      {
        success: false,
        error: "Geçerli bir birim kimliği girilmelidir.",
      },
      {
        status: 400,
        headers: createNoStoreHeaders(),
      }
    );
  }

  try {
    const currentStaff = await prisma.staffUser.findUnique({
      where: {
        id: payload.staffUserId,
      },
      select: {
        id: true,
        role: true,
        unitId: true,
        isActive: true,
      },
    });

    if (!currentStaff || !currentStaff.isActive) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Personel hesabı bulunamadı veya pasif durumda.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      currentStaff.role !== "ADMIN" &&
      currentStaff.role !== "UNIT_MANAGER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Personel listesine erişim yetkiniz bulunmuyor.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    if (
      currentStaff.role === "UNIT_MANAGER" &&
      currentStaff.unitId !== requestedUnitId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yalnızca kendi biriminizdeki personelleri görüntüleyebilirsiniz.",
        },
        {
          status: 403,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const unit = await prisma.unit.findUnique({
      where: {
        id: requestedUnitId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });

    if (!unit || !unit.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Birim bulunamadı veya aktif değil.",
        },
        {
          status: 404,
          headers: createNoStoreHeaders(),
        }
      );
    }

    const staff = await prisma.staffUser.findMany({
      where: {
        unitId: requestedUnitId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        unitId: true,
      },
      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        unit: {
          id: unit.id,
          code: unit.code,
          name: unit.name,
        },
        staff,
      },
      {
        status: 200,
        headers: createNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Aktif personeller alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Personeller alınırken sunucu hatası oluştu.",
      },
      {
        status: 500,
        headers: createNoStoreHeaders(),
      }
    );
  }
}