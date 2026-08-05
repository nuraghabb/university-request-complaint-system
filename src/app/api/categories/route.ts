import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "Kategoriler alınamadı:",
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
      }
    );
  }
}