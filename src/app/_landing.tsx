"use client";

import Link from "next/link";

const QUICK_ACTIONS = [
  {
    href: "/basvuru-misafir",
    icon: "📝",
    title: "Başvuru Oluştur",
    description:
      "Kayıt olmadan dilek, öneri, şikâyet veya bilgi edinme başvurusu yapın.",
  },
  {
    href: "/basvuru-takip",
    icon: "📍",
    title: "Başvuru Takibi",
    description:
      "Takip kodunuz ve e-posta adresinizle başvurunuzun güncel durumunu görüntüleyin.",
  },
];

const LOGIN_ACTIONS = [
  {
    href: "/giris",
    icon: "🔐",
    title: "Personel Girişi",
    description: "Yetkili kurum personeli için giriş ekranı.",
  },
  {
    href: "/ogrenci-akademisyen-giris",
    icon: "🎓",
    title: "Öğrenci / Akademisyen",
    description: "Öğrenci ve akademisyenler için giriş ekranı.",
  },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Hızlı Başvuru",
    description:
      "Kayıt oluşturmadan birkaç adımda başvurunuzu iletebilirsiniz.",
  },
  {
    icon: "🔎",
    title: "Şeffaf Takip",
    description:
      "Başvurunuzun durumunu takip kodu ile istediğiniz zaman sorgulayın.",
  },
  {
    icon: "🏢",
    title: "Doğru Birim",
    description:
      "Başvurular ilgili birime yönlendirilir ve ilgili personel tarafından işleme alınır.",
  },
  {
    icon: "🛡️",
    title: "Güvenli Süreç",
    description:
      "Kimlik doğrulama ve e-posta onayı ile başvuru süreciniz güvence altındadır.",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <img
            src="/uni_logo.gif"
            alt="Mersin Üniversitesi"
            className="landing-logo-img"
          />

          <p className="landing-eyebrow">Mersin Üniversitesi</p>

          <h1 className="landing-title">
            Dilek, Öneri ve Başvuru Yönetim Sistemi
          </h1>

          <p className="landing-subtitle">
            Taleplerinizi, önerilerinizi ve şikâyetlerinizi ilgili
            birimlere kolayca iletin; sürecin her adımını şeffaf bir
            şekilde takip edin.
          </p>

          <div className="landing-cta">
            <Link href="/basvuru-misafir" className="btn btn-accent btn-lg">
              📝 Başvuru Oluştur
            </Link>

            <Link href="/basvuru-takip" className="btn btn-hero-ghost btn-lg">
              📍 Başvuru Takip Et
            </Link>
          </div>
        </div>
      </section>

      <section className="main-content landing-content">
        <div className="landing-grid landing-grid-two">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="landing-card"
            >
              <div className="landing-card-icon">{action.icon}</div>
              <h2 className="landing-card-title">{action.title}</h2>
              <p className="landing-card-desc">{action.description}</p>
              <span className="landing-card-link">
                Devam et →
              </span>
            </Link>
          ))}
        </div>

        <div className="divider" />

        <h2 className="section-title">Kullanıcı Girişleri</h2>

        <div className="landing-grid landing-grid-two">
          {LOGIN_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="landing-card"
            >
              <div className="landing-card-icon">{action.icon}</div>
              <h2 className="landing-card-title">{action.title}</h2>
              <p className="landing-card-desc">{action.description}</p>
              <span className="landing-card-link">
                Giriş yap →
              </span>
            </Link>
          ))}
        </div>

        <div className="divider" />

        <h2 className="section-title">Neden Bu Sistem?</h2>

        <div className="landing-grid landing-grid-four">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
