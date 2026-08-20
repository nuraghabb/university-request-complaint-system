"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type StaffRole = "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF" | "STUDENT" | "ACADEMIC";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  unit?: { id: number; code: string; name: string } | null;
}

interface Petition {
  id: number;
  trackingCode: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Sistem Yöneticisi",
  UNIT_MANAGER: "Birim Yöneticisi",
  UNIT_STAFF: "Birim Personeli",
  STUDENT: "Öğrenci",
  ACADEMIC: "Akademisyen",
};

const STATUS_LABELS: Record<string, string> = {
  EMAIL_PENDING: "E-posta Bekleniyor",
  RECEIVED: "Alındı",
  ASSIGNED: "Atandı",
  IN_REVIEW: "İnceleniyor",
  FORWARDED: "Yönlendirildi",
  ANSWERED: "Cevaplandı",
  CLOSED: "Kapatıldı",
  REJECTED: "Reddedildi",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  EMAIL_PENDING: { bg: "#fef3c7", text: "#92400e" },
  RECEIVED: { bg: "#dbeafe", text: "#1e40af" },
  ASSIGNED: { bg: "#e0e7ff", text: "#3730a3" },
  IN_REVIEW: { bg: "#fef9c3", text: "#854d0e" },
  FORWARDED: { bg: "#f3e8ff", text: "#6b21a8" },
  ANSWERED: { bg: "#dcfce7", text: "#166534" },
  CLOSED: { bg: "#f1f5f9", text: "#475569" },
  REJECTED: { bg: "#fee2e2", text: "#991b1b" },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "#f1f5f9", text: "#64748b" },
  NORMAL: { bg: "#dbeafe", text: "#2563eb" },
  HIGH: { bg: "#fef3c7", text: "#d97706" },
  URGENT: { bg: "#fee2e2", text: "#dc2626" },
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

function getDetailPath(role: StaffRole, petitionId: number): string {
  switch (role) {
    case "STUDENT":
      return `/dashboard/ogrenci/basvurular/${petitionId}`;
    case "ACADEMIC":
      return `/dashboard/akademik/basvurular/${petitionId}`;
    default:
      return `/dashboard/personel/basvurular/${petitionId}`;
  }
}

function getDashboardPathForRole(role: StaffRole): string {
  switch (role) {
    case "STUDENT": return "/dashboard/ogrenci";
    case "ACADEMIC": return "/dashboard/akademik";
    case "ADMIN": return "/dashboard/admin";
    case "UNIT_MANAGER": return "/dashboard/birim-muduru";
    case "UNIT_STAFF": return "/dashboard/birim-personeli";
    default: return "/dashboard";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!meRes.ok) { router.push("/"); return; }
        const meData = await meRes.json();
        if (!meData.success || !meData.user) { router.push("/"); return; }
        setUser(meData.user);

        const petRes = await fetch("/api/user/my-petitions", {
          credentials: "include",
          cache: "no-store",
        });
        if (petRes.ok) {
          const petData = await petRes.json();
          setPetitions(petData.petitions || []);
        }
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  const stats = useMemo(
    () => ({
      total: petitions.length,
      processing: petitions.filter((p) =>
        ["RECEIVED", "ASSIGNED", "IN_REVIEW", "FORWARDED"].includes(p.status)
      ).length,
      completed: petitions.filter((p) =>
        ["ANSWERED", "CLOSED"].includes(p.status)
      ).length,
    }),
    [petitions]
  );

  if (loading) {
    return (
      <div className="page-wrapper">
        <main className="main-content">
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div className="spinner spinner-dark" style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-muted)" }}>Profil yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const statsArr = [
    { value: stats.total, label: "Toplam Başvuru", color: "var(--primary)" },
    { value: stats.processing, label: "İşlemde", color: "#d97706" },
    { value: stats.completed, label: "Tamamlanan", color: "#16a34a" },
  ];

  return (
    <div className="page-wrapper">
      <main className="main-content">

        {/* Avatar + Name */}
        <div className="profile-hero">
          <div className="profile-avatar-lg">{initials}</div>
          <h1 className="profile-name">{user.firstName} {user.lastName}</h1>
          <p className="profile-role">{ROLE_LABELS[user.role] ?? user.role}</p>
        </div>

        {/* Info Cards */}
        <div className="profile-info-grid">
          <div className="profile-info-card">
            <span className="profile-info-label">E-posta</span>
            <span className="profile-info-value">{user.email}</span>
          </div>
          {user.unit && (
            <div className="profile-info-card">
              <span className="profile-info-label">Birim</span>
              <span className="profile-info-value">{user.unit.name}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="profile-stats-row">
          {statsArr.map((s) => (
            <div key={s.label} className="profile-stat-item">
              <span className="profile-stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="profile-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Başvurularım */}
        <div className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Başvurularım</h2>
            <Link
              href="/dashboard/basvuru-olustur"
              className="btn btn-primary btn-sm"
            >
              + Yeni Başvuru
            </Link>
          </div>

          {petitions.length === 0 ? (
            <div className="profile-empty">
              <div className="profile-empty-icon">📭</div>
              <p className="profile-empty-text">Henüz başvurunuz bulunmuyor</p>
              <Link
                href="/dashboard/basvuru-olustur"
                className="btn btn-primary btn-sm"
              >
                İlk Başvurunu Oluştur
              </Link>
            </div>
          ) : (
            <div className="profile-petition-list">
              {petitions.map((petition) => {
                const stColor = STATUS_COLORS[petition.status] ?? { bg: "#f1f5f9", text: "#475569" };
                const prColor = PRIORITY_COLORS[petition.priority] ?? { bg: "#f1f5f9", text: "#64748b" };
                return (
                  <article
                    key={petition.id}
                    className="profile-petition-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(getDetailPath(user.role, petition.id))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(getDetailPath(user.role, petition.id));
                      }
                    }}
                  >
                    <div className="profile-petition-left">
                      <span className="profile-petition-tracking">{petition.trackingCode}</span>
                      <span className="profile-petition-subject">{petition.subject}</span>
                      <span className="profile-petition-date">{formatDate(petition.createdAt)}</span>
                    </div>
                    <div className="profile-petition-right">
                      <span
                        className="profile-tag"
                        style={{ background: stColor.bg, color: stColor.text }}
                      >
                        {STATUS_LABELS[petition.status] ?? petition.status}
                      </span>
                      <span
                        className="profile-tag"
                        style={{ background: prColor.bg, color: prColor.text }}
                      >
                        {PRIORITY_LABELS[petition.priority] ?? petition.priority}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="profile-logout-section">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="profile-logout-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Çıkış Yap
          </button>
        </div>

      </main>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek &amp; Öneri Sistemi © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
