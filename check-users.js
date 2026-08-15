const { Client } = require("pg");

const c = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1234",
  database: "mersin_dilek_oneri",
});

c.connect()
  .then(async () => {
    console.log("=== VERITABANI KONTROL ===\n");

    // Internal Users
    const internalUsers = await c.query(
      'SELECT id, email, role, "firstName", "lastName", "studentNumber", "academicTitle", "passwordHash" FROM "InternalUser" ORDER BY email'
    );

    console.log("=== İÇ KULLANICILAR ===");
    if (internalUsers.rows.length === 0) {
      console.log("❌ İç kullanıcı bulunamadı!");
    } else {
      internalUsers.rows.forEach((row, i) => {
        const extra = row.studentNumber
          ? ` (${row.studentNumber})`
          : row.academicTitle
            ? ` (${row.academicTitle})`
            : "";
        console.log(
          `${i + 1}. ${row.firstName} ${row.lastName} (${row.email}) - ${row.role}${extra}`
        );
        console.log(
          `   Hash mevcut: ${row.passwordHash ? "✅" : "❌"}`
        );
      });
    }

    // Staff Users
    const staffUsers = await c.query(
      'SELECT id, email, role, "firstName", "lastName" FROM "StaffUser" ORDER BY email'
    );

    console.log("\n=== PERSONEL KULLANICILAR ===");
    if (staffUsers.rows.length === 0) {
      console.log("❌ Personel kullanıcısı bulunamadı!");
    } else {
      staffUsers.rows.forEach((row, i) => {
        console.log(
          `${i + 1}. ${row.firstName} ${row.lastName} (${row.email}) - ${row.role}`
        );
      });
    }

    console.log(
      `\n📊 Toplam: ${internalUsers.rows.length} iç kullanıcı + ${staffUsers.rows.length} personel`
    );

    await c.end();
  })
  .catch((e) => {
    console.error("❌ HATA:", e.message);
    process.exit(1);
  });
