import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const category = await prisma.category.findFirst({ where: { code: "TALEP" } });
  const unit = await prisma.unit.findFirst({ where: { code: "OGRENCI_ISLERI" } });
  const user = await prisma.internalUser.findFirst();

  console.log("category:", category?.id, "unit:", unit?.id, "user:", user?.id);

  if (!category || !unit || !user) throw new Error("gerekli veri yok");

  const created = await prisma.petition.create({
    data: {
      trackingCode: "TEST" + Date.now(),
      applicantFirstName: user.firstName,
      applicantLastName: user.lastName,
      applicantEmail: user.email,
      applicantPhone: null,
      internalUserId: user.id,
      applicantRoleTag: "İÇ/ÖĞRENCİ",
      identityVerifiedAt: new Date(),
      botCheckVerifiedAt: new Date(),
      privacyNoticeVersion: "2026-08-01",
      privacyNoticeAcknowledgedAt: new Date(),
      emailVerifiedAt: new Date(),
      categoryId: category.id,
      targetUnitId: unit.id,
      subject: "test konu",
      content: "test içerik uzun metin 0123456789",
      status: "RECEIVED",
      priority: "NORMAL",
    },
    select: { id: true, trackingCode: true },
  });
  console.log("CREATED OK:", JSON.stringify(created));

  await prisma.petition.delete({ where: { id: created.id } });
  console.log("CLEANUP OK");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
