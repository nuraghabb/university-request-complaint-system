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
      "SELECT column_name FROM information_schema.columns WHERE table_name='petitions' ORDER BY ordinal_position"
    );
    console.log(r.rows.map((x) => x.column_name).join("\n"));
    await c.end();
  })
  .catch((e) => console.error("HATA:", e.message));
