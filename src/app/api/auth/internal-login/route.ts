import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrismaClient } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { logInternalUserLogin } from "@/lib/audit";

function getClientIp(req: NextRequest): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}

export async function POST(req: NextRequest) {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "E-posta ve şifre gerekli." },
                { status: 400 }
            );
        }

        const prisma = getPrismaClient();

        const internalUser = await prisma.internalUser.findUnique({
            where: { email },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                passwordHash: true,
                role: true,
                isActive: true,
            },
        });

        if (!internalUser) {
            return NextResponse.json(
                { error: "E-posta veya şifre hatalı." },
                { status: 401 }
            );
        }

        if (!internalUser.isActive) {
            return NextResponse.json(
                { error: "Bu hesap devre dışı bırakılmıştır." },
                { status: 403 }
            );
        }

        const passwordMatch = await bcrypt.compare(
            password,
            internalUser.passwordHash
        );

        if (!passwordMatch) {
            return NextResponse.json(
                { error: "E-posta veya şifre hatalı." },
                { status: 401 }
            );
        }

        // Update last login
        await prisma.internalUser.update({
            where: { id: internalUser.id },
            data: { lastLoginAt: new Date() },
        });

        // Log successful login
        await logInternalUserLogin(
            internalUser.id,
            internalUser.email,
            ipAddress,
            userAgent
        );

        // Create JWT token
        const token = signToken({
            id: internalUser.id.toString(),
            email: internalUser.email,
            type: "INTERNAL_USER",
            role: internalUser.role,
        });

        // Set secure cookie
        const response = NextResponse.json(
            {
                success: true,
                user: {
                    id: internalUser.id,
                    firstName: internalUser.firstName,
                    lastName: internalUser.lastName,
                    email: internalUser.email,
                    role: internalUser.role,
                },
            },
            { status: 200 }
        );

        response.cookies.set({
            name: "auth_token",
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("İç kullanıcı giriş hatası:", error);
        return NextResponse.json(
            { error: "Giriş işlemi sırasında hata oluştu." },
            { status: 500 }
        );
    }
}
