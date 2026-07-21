import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seed başlıyor...');

  // Kullanıcıları temizle
  await prisma.petition.deleteMany();
  await prisma.user.deleteMany();

  const hash = async (pwd: string) => await bcrypt.hash(pwd, 10);

  // ── Akademik Personel ──────────────────────────────────────────────────────
  const akademisyen1 = await prisma.user.create({
    data: {
      tcKimlik: '12345678901',
      sicilNo: 'S001',
      ad: 'Ahmet',
      soyad: 'Yılmaz',
      email: 'ahmet.yilmaz@mersin.edu.tr',
      password: await hash('akademik123'),
      telefon: '05321234567',
      userType: 'ACADEMIC',
      bolum: 'Mühendislik Fakültesi - Bilgisayar Mühendisliği',
      unvan: 'Doç. Dr.',
    },
  });

  const akademisyen2 = await prisma.user.create({
    data: {
      tcKimlik: '12345678902',
      sicilNo: 'S002',
      ad: 'Ayşe',
      soyad: 'Kaya',
      email: 'ayse.kaya@mersin.edu.tr',
      password: await hash('akademik123'),
      telefon: '05329876543',
      userType: 'ACADEMIC',
      bolum: 'Edebiyat Fakültesi - Türk Dili ve Edebiyatı',
      unvan: 'Prof. Dr.',
    },
  });

  // ── Öğrenciler ─────────────────────────────────────────────────────────────
  const ogrenci1 = await prisma.user.create({
    data: {
      tcKimlik: '23456789012',
      ogrenciNo: '2021123456',
      ad: 'Mehmet',
      soyad: 'Demir',
      email: 'mehmet.demir@std.mersin.edu.tr',
      password: await hash('ogrenci123'),
      telefon: '05335551234',
      userType: 'STUDENT',
      bolum: 'Mühendislik Fakültesi - Elektrik-Elektronik Mühendisliği',
    },
  });

  const ogrenci2 = await prisma.user.create({
    data: {
      tcKimlik: '23456789013',
      ogrenciNo: '2022987654',
      ad: 'Zeynep',
      soyad: 'Çelik',
      email: 'zeynep.celik@std.mersin.edu.tr',
      password: await hash('ogrenci123'),
      telefon: '05337779988',
      userType: 'STUDENT',
      bolum: 'İktisadi ve İdari Bilimler Fakültesi - İşletme',
    },
  });

  // ── Vatandaşlar ────────────────────────────────────────────────────────────
  const vatandas1 = await prisma.user.create({
    data: {
      tcKimlik: '34567890123',
      ad: 'Fatma',
      soyad: 'Öztürk',
      email: 'fatma.ozturk@gmail.com',
      password: await hash('vatandas123'),
      telefon: '05381112233',
      userType: 'CITIZEN',
    },
  });

  const vatandas2 = await prisma.user.create({
    data: {
      tcKimlik: '34567890124',
      ad: 'Hasan',
      soyad: 'Arslan',
      email: 'hasan.arslan@hotmail.com',
      password: await hash('vatandas123'),
      telefon: '05384445566',
      userType: 'CITIZEN',
    },
  });

  // ── Örnek Dilekçeler ───────────────────────────────────────────────────────
  const petitions = [
    {
      trackingCode: 'MER20240001',
      userId: ogrenci1.id,
      category: 'SIKAYET',
      targetUnit: 'BILGI_ISLEM',
      konu: 'Üniversite Wi-Fi Bağlantı Problemi',
      icerik: 'Mühendislik Fakültesi binasında internet bağlantısı son 2 haftadır çok yavaş ve sık sık kesiliyor. Özellikle öğle saatlerinde bağlantı tamamen kopuyor. Bu durum derslerimizi ve araştırma çalışmalarımızı olumsuz etkilemektedir. Gerekli teknik müdahalenin yapılmasını talep ediyorum.',
      status: 'INCELEMEDE',
    },
    {
      trackingCode: 'MER20240002',
      userId: akademisyen1.id,
      category: 'TALEP',
      targetUnit: 'REKTORLUK',
      konu: 'Araştırma Laboratuvarı Ekipman Talebi',
      icerik: 'Bilgisayar Mühendisliği Bölümü olarak yapay zeka araştırmalarımız için GPU sunucusuna ihtiyaç duymaktayız. Mevcut ekipmanlar yetersiz kalmakta ve araştırmalarımızı kısıtlamaktadır. Ek bütçe tahsisi veya ekipman temin edilmesini talep ediyorum.',
      status: 'CEVAPLANDI',
      adminNotu: 'Talebiniz değerlendirilmiş olup 2024 yılı bütçe planlamasına dahil edilmiştir. Satın alma süreci Mart 2024\'te başlayacaktır.',
      cevapTarihi: new Date('2024-02-15'),
    },
    {
      trackingCode: 'MER20240003',
      userId: vatandas1.id,
      category: 'BILGI_EDINME',
      targetUnit: 'OGRENCI_ISLERI',
      konu: 'Yatay Geçiş Başvuru Koşulları Hakkında Bilgi',
      icerik: 'Çocuğumun başka bir üniversiteden Mersin Üniversitesi\'ne yatay geçiş yapması için gereken koşulları, başvuru takvimini ve gerekli belgeleri öğrenmek istiyorum.',
      status: 'CEVAPLANDI',
      adminNotu: 'Yatay geçiş başvuruları her yıl Haziran-Temmuz aylarında yapılmaktadır. Detaylı bilgi için https://ogrenciisleri.mersin.edu.tr adresini ziyaret edebilirsiniz.',
      cevapTarihi: new Date('2024-01-20'),
    },
    {
      trackingCode: 'MER20240004',
      userId: ogrenci2.id,
      category: 'ONERI',
      targetUnit: 'SAGLIK_KULTUR',
      konu: 'Kampüs Spor Tesislerinin Genişletilmesi',
      icerik: 'Kampüsümüzdeki spor tesisleri öğrenci sayısına kıyasla yetersiz kalmaktadır. Spor salonuna erişim için uzun süreler beklenmektedir.',
      status: 'BEKLEMEDE',
    },
    {
      trackingCode: 'MER20240005',
      userId: akademisyen2.id,
      category: 'TESEKKUR',
      targetUnit: 'KÜTÜPHANE',
      konu: 'Kütüphane Hizmetleri İçin Teşekkür',
      icerik: 'Merkez Kütüphanesi çalışanlarına gösterdikleri ilgi ve yardımseverlik için teşekkür etmek istiyorum.',
      status: 'KAPATILDI',
      adminNotu: 'Değerli geri bildiriminiz için teşekkür ederiz. Ekibimizi motive eden yorumunuz tüm çalışanlarımızla paylaşıldı.',
      cevapTarihi: new Date('2024-01-10'),
    },
    {
      trackingCode: 'MER20240006',
      userId: vatandas2.id,
      category: 'SIKAYET',
      targetUnit: 'YAPI_ISLER',
      konu: 'Kampüs Çevresi Aydınlatma Sorunu',
      icerik: 'Üniversite kampüsünün ana girişine yakın yoldaki sokak lambaları uzun süredir çalışmamaktadır.',
      status: 'INCELEMEDE',
      adminNotu: 'Şikayetiniz alındı, teknik ekibimiz durumu incelemektedir.',
    },
  ];

  for (const p of petitions) {
    await (prisma.petition as any).create({ data: p });
  }

  console.log('✅ Seed tamamlandı!');
  console.log('\n📋 Test Kullanıcıları:');
  console.log('──────────────────────────────────────────────────────────');
  console.log('Akademik Personel:');
  console.log('  Email: ahmet.yilmaz@mersin.edu.tr  | Şifre: akademik123');
  console.log('  Email: ayse.kaya@mersin.edu.tr     | Şifre: akademik123');
  console.log('Öğrenci:');
  console.log('  Email: mehmet.demir@std.mersin.edu.tr | Şifre: ogrenci123');
  console.log('  Email: zeynep.celik@std.mersin.edu.tr | Şifre: ogrenci123');
  console.log('Vatandaş:');
  console.log('  Email: fatma.ozturk@gmail.com      | Şifre: vatandas123');
  console.log('  Email: hasan.arslan@hotmail.com    | Şifre: vatandas123');
  console.log('──────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });
