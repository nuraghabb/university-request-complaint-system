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
    const r = await c.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log("📊 VERİTABANI TABLOLARI:\n");
    r.rows.forEach((row) => console.log("  •", row.table_name));
    console.log(`\nToplam: ${r.rows.length} tablo`);
    await c.end();
  })
  .catch((e) => {
    console.error("❌ HATA:", e.message);
  });
