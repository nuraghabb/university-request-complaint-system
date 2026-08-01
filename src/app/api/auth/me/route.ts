import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          user: null,
          error: "Oturum bulunamadı.",
        },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      const response = NextResponse.json(
        {
          success: false,
          user: null,
          error: "Oturum geçersiz veya süresi dolmuş.",
        },
        { status: 401 }
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
      const response = NextResponse.json(
        {
          success: false,
          user: null,
          error: "Personel hesabı bulunamadı veya pasif durumda.",
        },
        { status: 401 }
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

    return NextResponse.json({
      success: true,
      user: {
        id: staffUser.id,
        firstName: staffUser.firstName,
        lastName: staffUser.lastName,
        email: staffUser.email,
        role: staffUser.role,
        unit: staffUser.unit,
      },
    });
  } catch (error) {
    console.error(
      "Personel oturum kontrolü hatası:",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        user: null,
        error: "Oturum kontrolü sırasında sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}