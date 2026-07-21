import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { generateTrackingCode } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });
  }

  try {
    const petitions = await prisma.petition.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ petitions });
  } catch (error) {
    console.error('Petitions fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const body = await request.json();
    const { category, targetUnit, konu, icerik, adSoyad, email, telefon, tcKimlik } = body;

    if (!category || !targetUnit || !konu || !icerik) {
      return NextResponse.json(
        { error: 'Kategori, hedef birim, konu ve içerik zorunludur.' },
        { status: 400 }
      );
    }

    let userId: number | null = null;
    if (token) {
      const payload = verifyToken(token);
      if (payload) userId = payload.userId;
    }

    // Misafir başvurular için e-posta zorunlu
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Giriş yapmadan başvuru için e-posta adresi zorunludur.' },
        { status: 400 }
      );
    }

    let trackingCode = generateTrackingCode();
    // Benzersizlik kontrolü
    let existing = await prisma.petition.findUnique({ where: { trackingCode } });
    while (existing) {
      trackingCode = generateTrackingCode();
      existing = await prisma.petition.findUnique({ where: { trackingCode } });
    }

    const petition = await prisma.petition.create({
      data: {
        trackingCode,
        userId,
        category,
        targetUnit,
        konu,
        icerik,
        adSoyad: userId ? null : adSoyad,
        email: userId ? null : email,
        telefon: userId ? null : telefon,
        tcKimlik: userId ? null : tcKimlik,
      },
    });

    return NextResponse.json({ success: true, petition }, { status: 201 });
  } catch (error) {
    console.error('Petition create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 });
  }
}
