"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Petition {
  id: number;
  trackingCode: string;
  applicantFirstName: string;
  applicantLastName: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}>Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1>Yönetici Paneli</h1>
          <p>Mersin Üniversitesi Dilekçe Yönetim Sistemi</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Çıkış Yap
        </button>
      </header>

      <div style={styles.content}>
        <div style={styles.userInfo}>
          <h2>Hoşgeldiniz, {user.firstName} {user.lastName}</h2>
          <p style={styles.role}>
            Rol: <strong>{user.role === "ADMIN" ? "Sistem Yöneticisi" : user.role}</strong>
          </p>
        </div>

        <div style={styles.menuGrid}>
          <Link href="/dashboard/admin/categories" style={styles.menuItem}>
            <div style={styles.menuIcon}>📂</div>
            <div>
              <h3>Kategoriler</h3>
              <p>Başvuru kategorilerini yönet</p>
            </div>
          </Link>

          <Link href="/dashboard/admin/units" style={styles.menuItem}>
            <div style={styles.menuIcon}>🏢</div>
            <div>
              <h3>Birimler</h3>
              <p>Üniversite birimlerini yönet</p>
            </div>
          </Link>

          <div style={styles.menuItem} onClick={() => alert("Gelecek özellik")}>
            <div style={styles.menuIcon}>📊</div>
            <div>
              <h3>Raporlar</h3>
              <p>Başvuru istatistikleri ve raporlar</p>
            </div>
          </div>

          <div style={styles.menuItem} onClick={() => alert("Gelecek özellik")}>
            <div style={styles.menuIcon}>👥</div>
            <div>
              <h3>Personel</h3>
              <p>Personel hesaplarını yönet</p>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <p>© 2026 Mersin Üniversitesi Dilekçe Yönetim Sistemi</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#0066cc",
    color: "white",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
  },
  logoutBtn: {
    padding: "8px 16px",
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  content: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 24px",
  },
  userInfo: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    marginBottom: "32px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  role: {
    margin: "8px 0 0",
    color: "#666",
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  menuItem: {
    display: "flex",
    gap: "16px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  menuIcon: {
    fontSize: "32px",
  },
  footer: {
    textAlign: "center",
    color: "#999",
    fontSize: "12px",
    marginTop: "32px",
  },
  spinner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontSize: "18px",
  },
};
