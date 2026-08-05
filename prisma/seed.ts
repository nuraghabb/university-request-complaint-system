import dotenv from "dotenv";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

dotenv.config({
  path: ".env.local",
});

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} tanımlı değil. Seed çalıştırmadan önce .env.local dosyasını kontrol edin.`
    );
  }

  return value;
}

const connectionString =
  getRequiredEnvironmentVariable("DATABASE_URL");

const adminPassword =
  getRequiredEnvironmentVariable("SEED_ADMIN_PASSWORD");

if (adminPassword.length < 8) {
  throw new Error(
    "SEED_ADMIN_PASSWORD en az 8 karakter olmalıdır."
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const categories = [
  {
    code: "TALEP",
    name: "Talep",
    description:
      "Üniversite birimlerinden hizmet, işlem veya destek talep edilen başvurular.",
  },
  {
    code: "SIKAYET",
    name: "Şikâyet",
    description:
      "Üniversite hizmetleri, işlemleri veya uygulamalarıyla ilgili şikâyet başvuruları.",
  },
  {
    code: "BILGI_EDINME",
    name: "Bilgi Edinme",
    description:
      "Üniversiteyle ilgili bilgi edinmek amacıyla oluşturulan başvurular.",
  },
  {
    code: "TESEKKUR",
    name: "Teşekkür",
    description:
      "Üniversite personeli, birimleri veya hizmetleriyle ilgili teşekkür başvuruları.",
  },
  {
    code: "ONERI",
    name: "Öneri",
    description:
      "Üniversite hizmetlerinin ve süreçlerinin geliştirilmesine yönelik öneriler.",
  },
] as const;

const units = [
  {
    code: "REKTORLUK",
    name: "Rektörlük",
    email: "rektorluk@mersin.edu.tr",
  },
  {
    code: "OGRENCI_ISLERI",
    name: "Öğrenci İşleri Daire Başkanlığı",
    email: "ogrenciisleri@mersin.edu.tr",
  },
  {
    code: "FEN_BILIMLERI",
    name: "Fen Fakültesi Dekanlığı",
    email: "fen@mersin.edu.tr",
  },
  {
    code: "EDEBIYAT",
    name: "İnsan ve Toplum Bilimleri Fakültesi Dekanlığı",
    email: "edebiyat@mersin.edu.tr",
  },
  {
    code: "MUHENDISLIK",
    name: "Mühendislik Fakültesi Dekanlığı",
    email: "muhendislik@mersin.edu.tr",
  },
  {
    code: "IKTISAT",
    name: "İktisadi ve İdari Bilimler Fakültesi Dekanlığı",
    email: "iibf@mersin.edu.tr",
  },
  {
    code: "TIP",
    name: "Tıp Fakültesi Dekanlığı",
    email: "tip@mersin.edu.tr",
  },
  {
    code: "HUKUK",
    name: "Hukuk Fakültesi Dekanlığı",
    email: "hukuk@mersin.edu.tr",
  },
  {
    code: "EGITIM",
    name: "Eğitim Fakültesi Dekanlığı",
    email: "egitim@mersin.edu.tr",
  },
  {
    code: "BILGI_ISLEM",
    name: "Bilgi İşlem Daire Başkanlığı",
    email: "bilgiislem@mersin.edu.tr",
  },
  {
    code: "YAPI_ISLERI",
    name: "Yapı İşleri ve Teknik Daire Başkanlığı",
    email: "yapiisleri@mersin.edu.tr",
  },
  {
    code: "KUTUPHANE",
    name: "Kütüphane ve Dokümantasyon Daire Başkanlığı",
    email: "kutuphane@mersin.edu.tr",
  },
  {
    code: "SAGLIK_KULTUR",
    name: "Sağlık, Kültür ve Spor Daire Başkanlığı",
    email: "sks@mersin.edu.tr",
  },
] as const;

async function seedCategories(): Promise<void> {
  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        code: category.code,
      },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        isActive: true,
      },
    });
  }
}

async function seedUnits(): Promise<void> {
  for (const unit of units) {
    await prisma.unit.upsert({
      where: {
        code: unit.code,
      },
      update: {
        name: unit.name,
        email: unit.email,
        isActive: true,
      },
      create: {
        code: unit.code,
        name: unit.name,
        email: unit.email,
        isActive: true,
      },
    });
  }
}

async function seedAdminUser(): Promise<void> {
  const bilgiIslemUnit = await prisma.unit.findUnique({
    where: {
      code: "BILGI_ISLEM",
    },
    select: {
      id: true,
    },
  });

  if (!bilgiIslemUnit) {
    throw new Error(
      "Bilgi İşlem birimi oluşturulamadı."
    );
  }

  const passwordHash = await bcrypt.hash(
    adminPassword,
    12
  );

  await prisma.staffUser.upsert({
    where: {
      email: "admin@mersin.edu.tr",
    },
    update: {
      firstName: "Sistem",
      lastName: "Yöneticisi",
      passwordHash,
      role: "ADMIN",
      unitId: bilgiIslemUnit.id,
      isActive: true,
    },
    create: {
      firstName: "Sistem",
      lastName: "Yöneticisi",
      email: "admin@mersin.edu.tr",
      passwordHash,
      role: "ADMIN",
      unitId: bilgiIslemUnit.id,
      isActive: true,
    },
  });
}

async function main(): Promise<void> {
  console.log("🌱 Seed işlemi başlıyor...");

  await seedCategories();
  await seedUnits();
  await seedAdminUser();

  console.log("✅ Seed işlemi tamamlandı.");
  console.log("📌 Başvuru kategorileri oluşturuldu.");
  console.log("📌 Üniversite birimleri oluşturuldu.");
  console.log(
    "📌 Yönetici hesabı oluşturuldu veya güncellendi."
  );
  console.log(
    "📧 Yönetici e-postası: admin@mersin.edu.tr"
  );
  console.log(
    "🔐 Yönetici şifresi .env.local içindeki SEED_ADMIN_PASSWORD değeridir."
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "❌ Seed işlemi başarısız:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });