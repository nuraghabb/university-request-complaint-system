import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestBody;

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "E-posta ve şifre zorunludur.",
        },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "E-posta ve şifre zorunludur.",
        },
        { status: 400 }
      );
    }

    const staffUser = await prisma.staffUser.findUnique({
      where: {
        email,
      },
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!staffUser) {
      return NextResponse.json(
        {
          success: false,
          error: "E-posta veya şifre hatalı.",
        },
        { status: 401 }
      );
    }

    if (!staffUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hesabınız pasif durumda. Lütfen yöneticiyle iletişime geçin.",
        },
        { status: 403 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      staffUser.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          error: "E-posta veya şifre hatalı.",
        },
        { status: 401 }
      );
    }

    const token = signToken({
      staffUserId: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
      firstName: staffUser.firstName,
      lastName: staffUser.lastName,
    });

    await prisma.staffUser.update({
      where: {
        id: staffUser.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const response = NextResponse.json({
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

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(
      "Personel giriş hatası:",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Sunucu hatası oluştu. Lütfen tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}