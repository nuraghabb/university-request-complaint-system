# 🏛️ Mersin Üniversitesi — Dilek & Öneri Sistemi

Next.js 16 + PostgreSQL + Prisma 7 ile geliştirilmiş kurumsal dilek/öneri yönetim sistemi.

---

## 🚀 Kurulum

### 1. PostgreSQL Veritabanı Oluşturun

```sql
CREATE DATABASE mersin_dilek_oneri;
```

### 2. `.env` Dosyasını Güncelleyin

```
DATABASE_URL="postgresql://KULLANICI:SIFRE@localhost:5432/mersin_dilek_oneri?schema=public"
JWT_SECRET="mersin-universitesi-dilek-oneri-gizli-anahtar-2024"
```

> **Not:** `KULLANICI` ve `SIFRE` yerine PostgreSQL kullanıcı adı ve şifrenizi girin.

### 3. Bağımlılıkları Yükleyin

```bash
npm install
```

### 4. Veritabanı Şemasını Oluşturun

```bash
npx prisma db push
```

### 5. Test Verilerini Yükleyin

```bash
npx prisma db seed
```

### 6. Uygulamayı Başlatın

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde açılacaktır.

---

## 👤 Test Kullanıcıları

| Kullanıcı Türü | E-posta | Şifre |
|---|---|---|
| 🎓 Akademik Personel | ahmet.yilmaz@mersin.edu.tr | akademik123 |
| 🎓 Akademik Personel | ayse.kaya@mersin.edu.tr | akademik123 |
| 📚 Öğrenci | mehmet.demir@std.mersin.edu.tr | ogrenci123 |
| 📚 Öğrenci | zeynep.celik@std.mersin.edu.tr | ogrenci123 |
| 👤 Vatandaş | fatma.ozturk@gmail.com | vatandas123 |
| 👤 Vatandaş | hasan.arslan@hotmail.com | vatandas123 |

---

## 🏗️ Mimari

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # POST - Giriş
│   │   │   ├── logout/route.ts     # POST - Çıkış
│   │   │   └── me/route.ts         # GET  - Oturum kontrolü
│   │   └── petitions/
│   │       ├── route.ts            # GET/POST - Başvurular
│   │       └── track/[code]/route.ts  # GET - Takip sorgulama
│   ├── basvuru-misafir/page.tsx    # Misafir başvuru sayfası
│   ├── dashboard/
│   │   ├── akademik/page.tsx       # Akademik personel paneli
│   │   ├── ogrenci/page.tsx        # Öğrenci paneli
│   │   └── vatandas/page.tsx       # Vatandaş paneli
│   ├── giris/page.tsx              # Giriş sayfası
│   └── globals.css                 # Kurumsal tasarım sistemi
├── components/
│   ├── Navbar.tsx                  # Üst menü (kullanıcı tipi badge'i)
│   ├── PetitionList.tsx            # Başvuru listesi + detay modal
│   └── NewPetitionForm.tsx         # Yeni başvuru formu
└── lib/
    ├── constants.ts                # Kategori/birim etiketleri
    ├── jwt.ts                      # JWT yardımcı fonksiyonları
    └── prisma.ts                   # Prisma singleton istemcisi
```

## 🔑 Kullanıcı Tipleri & Otomatik Yönlendirme

| E-posta Domain | Tespit Yöntemi | Yönlendirme |
|---|---|---|
| `@mersin.edu.tr` | Sicil No var | → `/dashboard/akademik` |
| `@std.mersin.edu.tr` | Öğrenci No var | → `/dashboard/ogrenci` |
| Diğer | CITIZEN tipi | → `/dashboard/vatandas` |

Sistem giriş sırasında JWT token'ı okuyarak **userType** alanına göre otomatik yönlendirme yapar.

## 📋 Başvuru Kategorileri

- 📋 **Talep** — İstek ve talepler
- ⚠️ **Şikayet** — Şikayet bildirimleri
- ℹ️ **Bilgi Edinme** — Bilgi talepleri
- 🙏 **Teşekkür** — Olumlu geri bildirimler
- 💡 **Öneri** — İyileştirme önerileri

## 🏢 Hedef Birimler

- Rektörlük
- Öğrenci İşleri Daire Başkanlığı
- Fen Bilimleri, Edebiyat, Mühendislik, İktisadi ve İdari Bilimler, Tıp, Hukuk, Eğitim Fakülteleri Dekanlıkları
- Bilgi İşlem Daire Başkanlığı
- Yapı İşleri ve Teknik Daire Başkanlığı
- Kütüphane ve Dokümantasyon Daire Başkanlığı
- Sağlık, Kültür ve Spor Daire Başkanlığı
