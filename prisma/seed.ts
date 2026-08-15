import dotenv from "dotenv";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

dotenv.config();
dotenv.config({ path: ".env.local" });

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

const staffAccounts = [
  {
    firstName: "Sistem",
    lastName: "Yöneticisi",
    email: "admin@mersin.edu.tr",
    password: "admin1234",
    role: "ADMIN",
    unitCode: "BILGI_ISLEM",
  },
  {
    firstName: "Öğrenci",
    lastName: "İşleri Müdürü",
    email: "ogrenci.isleri.mudur@mersin.edu.tr",
    password: "ogrenci123",
    role: "UNIT_MANAGER",
    unitCode: "OGRENCI_ISLERI",
  },
  {
    firstName: "Elif",
    lastName: "Kaya",
    email: "elif.kaya@mersin.edu.tr",
    password: "birim123",
    role: "UNIT_STAFF",
    unitCode: "OGRENCI_ISLERI",
  },
  {
    firstName: "Bilgi",
    lastName: "İşlem Müdürü",
    email: "bilgi.islem.mudur@mersin.edu.tr",
    password: "bilgi123",
    role: "UNIT_MANAGER",
    unitCode: "BILGI_ISLEM",
  },
  {
    firstName: "Murat",
    lastName: "Yılmaz",
    email: "murat.yilmaz@mersin.edu.tr",
    password: "birim123",
    role: "UNIT_STAFF",
    unitCode: "BILGI_ISLEM",
  },
] as const;

const internalUsers = [
  {
    firstName: "Ahmet",
    lastName: "Çetin",
    email: "ahmet.cetin@std.mersin.edu.tr",
    password: "student123",
    role: "STUDENT",
    studentNumber: "2023001234",
    department: "Bilgisayar Mühendisliği",
  },
  {
    firstName: "Zeynep",
    lastName: "Arslan",
    email: "zeynep.arslan@std.mersin.edu.tr",
    password: "student123",
    role: "STUDENT",
    studentNumber: "2023001235",
    department: "Elektrik Mühendisliği",
  },
  {
    firstName: "Ali",
    lastName: "Demir",
    email: "ali.demir@std.mersin.edu.tr",
    password: "student123",
    role: "STUDENT",
    studentNumber: "2024001001",
    department: "Makine Mühendisliği",
  },
  {
    firstName: "Fatih",
    lastName: "Yılmaz",
    email: "fatih.yilmaz@mersin.edu.tr",
    password: "academic123",
    role: "ACADEMIC",
    academicTitle: "Prof. Dr.",
    department: "Bilgisayar Mühendisliği",
  },
  {
    firstName: "Leyla",
    lastName: "Kaplan",
    email: "leyla.kaplan@mersin.edu.tr",
    password: "academic123",
    role: "ACADEMIC",
    academicTitle: "Doç. Dr.",
    department: "Elektronik ve Haberleşme Mühendisliği",
  },
  {
    firstName: "Ismail",
    lastName: "Korkmaz",
    email: "ismail.korkmaz@mersin.edu.tr",
    password: "academic123",
    role: "ACADEMIC",
    academicTitle: "Dr. Öğr. Üyesi",
    department: "Bilgisayar Mühendisliği",
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

async function seedStaffUsers(): Promise<void> {
  for (const staffAccount of staffAccounts) {
    const unit = await prisma.unit.findUnique({
      where: {
        code: staffAccount.unitCode,
      },
      select: {
        id: true,
      },
    });

    if (!unit) {
      throw new Error(
        `Birim bulunamadı: ${staffAccount.unitCode}`
      );
    }

    const passwordHash = await bcrypt.hash(
      staffAccount.email === "admin@mersin.edu.tr"
        ? adminPassword
        : staffAccount.password,
      12
    );

    await prisma.staffUser.upsert({
      where: {
        email: staffAccount.email,
      },
      update: {
        firstName: staffAccount.firstName,
        lastName: staffAccount.lastName,
        passwordHash,
        role: staffAccount.role,
        unitId: unit.id,
        isActive: true,
      },
      create: {
        firstName: staffAccount.firstName,
        lastName: staffAccount.lastName,
        email: staffAccount.email,
        passwordHash,
        role: staffAccount.role,
        unitId: unit.id,
        isActive: true,
      },
    });
  }
}

async function seedSamplePetitions(): Promise<void> {
  const now = new Date();

  const samplePetitions = [
    {
      trackingCode: "MER20260001",
      applicantFirstName: "Ayşe",
      applicantLastName: "Demir",
      applicantEmail: "ayse.demir@gmail.com",
      applicantPhone: "+905551234567",
      identityVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      botCheckVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      privacyNoticeVersion: "2026-08-01",
      privacyNoticeAcknowledgedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      emailVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1),
      categoryCode: "TALEP",
      targetUnitCode: "OGRENCI_ISLERI",
      assignedStaffEmail: "elif.kaya@mersin.edu.tr",
      subject: "Transkript işlemi için bilgi talebi",
      content: "Öğrenci transkript işlemleriyle ilgili mevcut durum hakkında bilgi talep ediyorum.",
      status: "RECEIVED",
      priority: "HIGH",
    },
    {
      trackingCode: "MER20260002",
      applicantFirstName: "Mehmet",
      applicantLastName: "Yıldız",
      applicantEmail: "mehmet.yildiz@std.mersin.edu.tr",
      applicantPhone: "+905554321987",
      identityVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
      botCheckVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
      privacyNoticeVersion: "2026-08-01",
      privacyNoticeAcknowledgedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
      emailVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1),
      categoryCode: "SIKAYET",
      targetUnitCode: "BILGI_ISLEM",
      assignedStaffEmail: "murat.yilmaz@mersin.edu.tr",
      subject: "Öğrenci portalı erişim sorunu",
      content: "Öğrenci portalında güncelleme sonrası giriş yapamıyorum. Sorunun çözülmesini talep ediyorum.",
      status: "IN_REVIEW",
      priority: "URGENT",
    },
    {
      trackingCode: "MER20260003",
      applicantFirstName: "Fatma",
      applicantLastName: "Öztürk",
      applicantEmail: "fatma.ozturk@gmail.com",
      applicantPhone: "+905553333444",
      identityVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
      botCheckVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
      privacyNoticeVersion: "2026-08-01",
      privacyNoticeAcknowledgedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
      emailVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      categoryCode: "BILGI_EDINME",
      targetUnitCode: "REKTORLUK",
      assignedStaffEmail: "admin@mersin.edu.tr",
      subject: "Akademik takvim ve sınav tarihleri hakkındaki bilgi talebi",
      content: "Güz döneminde yapılacak sınav tarihleri ve akademik takvimle ilgili güncel bilgiyi talep ediyorum.",
      status: "ANSWERED",
      priority: "NORMAL",
    },
  ] as const;

  const adminUser = await prisma.staffUser.findUnique({
    where: { email: "admin@mersin.edu.tr" },
    select: { id: true },
  });

  if (!adminUser) {
    throw new Error("Yönetici hesabı bulunamadı.");
  }

  const staffUsersByEmail = new Map(
    (await prisma.staffUser.findMany({
      select: { id: true, email: true, unitId: true },
    })).map((staffUser) => [staffUser.email, staffUser])
  );

  for (const samplePetition of samplePetitions) {
    const category = await prisma.category.findUnique({
      where: { code: samplePetition.categoryCode },
      select: { id: true },
    });

    const targetUnit = await prisma.unit.findUnique({
      where: { code: samplePetition.targetUnitCode },
      select: { id: true },
    });

    if (!category || !targetUnit) {
      throw new Error(
        `Kategori veya birim bulunamadı: ${samplePetition.categoryCode}/${samplePetition.targetUnitCode}`
      );
    }

    const assignedStaff = staffUsersByEmail.get(samplePetition.assignedStaffEmail);

    const petition = await prisma.petition.upsert({
      where: {
        trackingCode: samplePetition.trackingCode,
      },
      update: {
        applicantFirstName: samplePetition.applicantFirstName,
        applicantLastName: samplePetition.applicantLastName,
        applicantEmail: samplePetition.applicantEmail,
        applicantPhone: samplePetition.applicantPhone,
        identityVerifiedAt: samplePetition.identityVerifiedAt,
        botCheckVerifiedAt: samplePetition.botCheckVerifiedAt,
        privacyNoticeVersion: samplePetition.privacyNoticeVersion,
        privacyNoticeAcknowledgedAt: samplePetition.privacyNoticeAcknowledgedAt,
        emailVerifiedAt: samplePetition.emailVerifiedAt,
        categoryId: category.id,
        targetUnitId: targetUnit.id,
        assignedStaffId: assignedStaff?.id ?? null,
        subject: samplePetition.subject,
        content: samplePetition.content,
        status: samplePetition.status,
        priority: samplePetition.priority,
      },
      create: {
        trackingCode: samplePetition.trackingCode,
        applicantFirstName: samplePetition.applicantFirstName,
        applicantLastName: samplePetition.applicantLastName,
        applicantEmail: samplePetition.applicantEmail,
        applicantPhone: samplePetition.applicantPhone,
        identityVerifiedAt: samplePetition.identityVerifiedAt,
        botCheckVerifiedAt: samplePetition.botCheckVerifiedAt,
        privacyNoticeVersion: samplePetition.privacyNoticeVersion,
        privacyNoticeAcknowledgedAt: samplePetition.privacyNoticeAcknowledgedAt,
        emailVerifiedAt: samplePetition.emailVerifiedAt,
        categoryId: category.id,
        targetUnitId: targetUnit.id,
        assignedStaffId: assignedStaff?.id ?? null,
        subject: samplePetition.subject,
        content: samplePetition.content,
        status: samplePetition.status,
        priority: samplePetition.priority,
      },
    });

    await prisma.petitionStatusHistory.createMany({
      data: [
        {
          petitionId: petition.id,
          fromStatus: null,
          toStatus: samplePetition.status,
          changedById: assignedStaff?.id ?? adminUser.id,
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 12),
        },
      ],
    });

    if (assignedStaff) {
      await prisma.petitionAssignment.create({
        data: {
          petitionId: petition.id,
          fromUnitId: null,
          toUnitId: targetUnit.id,
          assignedToId: assignedStaff.id,
          assignedById: adminUser.id,
          note: "Örnek iş akışı ataması",
        },
      });
    }
  }
}

async function seedInternalUsers(): Promise<void> {
  for (const internalUser of internalUsers) {
    const passwordHash = await bcrypt.hash(internalUser.password, 12);

    const studentNumber = "studentNumber" in internalUser ? (internalUser as any).studentNumber : null;
    const academicTitle = "academicTitle" in internalUser ? (internalUser as any).academicTitle : null;

    await prisma.internalUser.upsert({
      where: {
        email: internalUser.email,
      },
      update: {
        firstName: internalUser.firstName,
        lastName: internalUser.lastName,
        passwordHash,
        role: internalUser.role,
        studentNumber,
        academicTitle,
        department: internalUser.department ?? null,
        isActive: true,
      },
      create: {
        firstName: internalUser.firstName,
        lastName: internalUser.lastName,
        email: internalUser.email,
        passwordHash,
        role: internalUser.role,
        studentNumber,
        academicTitle,
        department: internalUser.department ?? null,
        isActive: true,
      },
    });
  }
}

async function main(): Promise<void> {
  console.log("🌱 Seed işlemi başlıyor...");

  await seedCategories();
  await seedUnits();
  await seedStaffUsers();
  await seedInternalUsers();
  await seedSamplePetitions();

  console.log("✅ Seed işlemi tamamlandı.");
  console.log("📌 Başvuru kategorileri oluşturuldu.");
  console.log("📌 Üniversite birimleri oluşturuldu.");
  console.log("📌 Rol bazlı örnek personel kullanıcıları oluşturuldu.");
  console.log("📌 İç kullanıcılar (öğrenci ve akademisyen) oluşturuldu.");
  console.log("📌 Örnek talepler ve yönlendirme akışı hazırlandı.");
  console.log("");
  console.log("👨‍💼 Personel Giriş Hesapları:");
  console.log("  📧 Yönetici: admin@mersin.edu.tr / admin1234");
  console.log("  📧 Birim Müdürü: ogrenci.isleri.mudur@mersin.edu.tr / ogrenci123");
  console.log("  📧 Birim Müdürü: bilgi.islem.mudur@mersin.edu.tr / bilgi123");
  console.log("  📧 Birim Personeli: elif.kaya@mersin.edu.tr / birim123");
  console.log("  📧 Birim Personeli: murat.yilmaz@mersin.edu.tr / birim123");
  console.log("");
  console.log("👨‍🎓 Öğrenci Giriş Hesapları:");
  console.log("  📧 Ahmet Çetin: ahmet.cetin@std.mersin.edu.tr / student123");
  console.log("  📧 Zeynep Arslan: zeynep.arslan@std.mersin.edu.tr / student123");
  console.log("  📧 Ali Demir: ali.demir@std.mersin.edu.tr / student123");
  console.log("");
  console.log("👨‍🏫 Akademisyen Giriş Hesapları:");
  console.log("  📧 Fatih Yılmaz: fatih.yilmaz@mersin.edu.tr / academic123");
  console.log("  📧 Leyla Kaplan: leyla.kaplan@mersin.edu.tr / academic123");
  console.log("  📧 Ismail Korkmaz: ismail.korkmaz@mersin.edu.tr / academic123");
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