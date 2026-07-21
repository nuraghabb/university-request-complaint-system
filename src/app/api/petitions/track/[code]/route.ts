import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const petition = await prisma.petition.findUnique({
      where: { trackingCode: code.toUpperCase() },
      include: {
        user: {
          select: {
            ad: true,
            soyad: true,
            email: true,
            userType: true,
            bolum: true,
          },
        },
      },
    });

    if (!petition) {
      return NextResponse.json(
        { error: 'Bu takip koduna ait başvuru bulunamadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ petition });
  } catch (error) {
    console.error('Petition fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 });
  }
}
