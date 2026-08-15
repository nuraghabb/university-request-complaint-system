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
    const r = await c.query("SELECT id, email, role FROM internal_users LIMIT 1");
    const row = r.rows[0];

    console.log("Sütun adlarını görmek için verileri kontrol ediyorum:\n");
    console.log("Mevcut sütunlar:");
    Object.keys(row).forEach(key => {
      console.log(`  - "${key}"`);
    });

    console.log("\n\nTüm verileri görmek için genel sorgu:");
    const all = await c.query("SELECT * FROM internal_users");
    console.log(JSON.stringify(all.rows[0], null, 2));

    await c.end();
  })
  .catch((e) => console.error("❌ HATA:", e.message));
