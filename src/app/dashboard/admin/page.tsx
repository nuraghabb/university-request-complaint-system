"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) {
          router.push("/giris");
          return;
        }
        const data = await response.json();
        setUser(data.user);
      } catch {
        router.push("/giris");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="spinner spinner-dark"
            style={{
              width: 40,
              height: 40,
              borderWidth: 3,
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "var(--text-muted)" }}>
            Yönetici paneli yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <h1 className="page-title">Yönetici Paneli</h1>

        <div className="landing-grid landing-grid-two">
          <Link
            href="/dashboard/admin/categories"
            className="landing-card"
          >
            <div className="landing-card-icon">📂</div>
            <h2 className="landing-card-title">Kategoriler</h2>
            <p className="landing-card-desc">
              Başvuru kategorilerini oluşturun ve yönetin.
            </p>
            <span className="landing-card-link">Yönet →</span>
          </Link>

          <Link
            href="/dashboard/admin/units"
            className="landing-card"
          >
            <div className="landing-card-icon">🏢</div>
            <h2 className="landing-card-title">Birimler</h2>
            <p className="landing-card-desc">
              Üniversite birimlerini oluşturun ve yönetin.
            </p>
            <span className="landing-card-link">Yönet →</span>
          </Link>

          <Link
            href="/dashboard/personel"
            className="landing-card"
          >
            <div className="landing-card-icon">📄</div>
            <h2 className="landing-card-title">Başvuru Yönetimi</h2>
            <p className="landing-card-desc">
              Başvuruları görüntüleyin, öncelik ve durum
              işlemlerini gerçekleştirin.
            </p>
            <span className="landing-card-link">Panele git →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
