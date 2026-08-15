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
    const r = await c.query("SELECT * FROM internal_users");
    console.log("📋 internal_users tablosu:\n");
    console.log(`Toplam kayıt: ${r.rows.length}\n`);

    if (r.rows.length > 0) {
      console.log("Sütunlar:", Object.keys(r.rows[0]));
      console.log("\nKullanıcılar:");
      r.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.first_name} ${row.last_name} (${row.email}) - ${row.role}`);
      });
    } else {
      console.log("❌ Tablo boş!");
    }

    await c.end();
  })
  .catch((e) => console.error("❌ HATA:", e.message));
