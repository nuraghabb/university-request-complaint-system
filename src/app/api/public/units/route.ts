import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      units,
    });
  } catch (error) {
    console.error(
      "Public birim listesi alınamadı:",
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
      }
    );
  }
}