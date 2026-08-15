const http = require("http");
const https = require("https");

// API endpoint'ini test et
const testLogin = async () => {
  const loginData = JSON.stringify({
    email: "ahmet.cetin@std.mersin.edu.tr",
    password: "student123",
  });

  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/internal-login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(loginData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("HTTP Status:", res.statusCode);
        console.log("Response:", data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on("error", (e) => {
      console.error("Request Error:", e.message);
      reject(e);
    });

    req.write(loginData);
    req.end();
  });
};

console.log("🔄 Öğrenci giriş test ediliyor...\n");
testLogin()
  .then((result) => {
    console.log(
      "\n✅ Test tamamlandı. Status:",
      result.status === 200 ? "✅ BAŞARILI" : "❌ BAŞARISIZ"
    );
    process.exit(result.status === 200 ? 0 : 1);
  })
  .catch((err) => {
    console.error("❌ Test hatası:", err.message);
    process.exit(1);
  });

// 10 saniye sonra timeout
setTimeout(() => {
  console.error(
    "❌ Timeout - Server çalışmıyor mu? (npm run dev başlatıldı mı?)"
  );
  process.exit(1);
}, 10000);
