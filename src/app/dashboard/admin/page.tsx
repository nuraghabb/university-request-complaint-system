"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type StaffRole = "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";

type PetitionStatus =
  | "EMAIL_PENDING"
  | "RECEIVED"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "FORWARDED"
  | "ANSWERED"
  | "CLOSED"
  | "REJECTED";

type PetitionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  unit: {
    id: number;
    code: string;
    name: string;
  } | null;
}

interface Unit {
  id: number;
  code: string;
  name: string;
  email: string;
  description: string | null;
  isActive: boolean;
}

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  unit: {
    id: number;
    code: string;
    name: string;
  } | null;
  isActive: boolean;
}

interface PetitionCategory {
  id: number;
  code: string;
  name: string;
}

interface Petition {
  id: number;
  trackingCode: string;
  applicantFirstName: string;
  applicantLastName: string;
  category: PetitionCategory;
  status: PetitionStatus;
  priority: PetitionPriority;
  subject: string;
  createdAt: string;
  targetUnit: {
    id: number;
    code: string;
    name: string;
  };
  assignedStaff: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

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

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

const STATUS_CLASS_MAP: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "status-received",
  RECEIVED: "status-received",
  ASSIGNED: "status-in-review",
  IN_REVIEW: "status-in-review",
  FORWARDED: "status-in-review",
  ANSWERED: "status-answered",
  CLOSED: "status-closed",
  REJECTED: "status-rejected",
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const meRes = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!meRes.ok) {
        router.replace("/giris");
        return;
      }

      const meData = await meRes.json();

      if (!meData.success || !meData.user) {
        router.replace("/giris");
        return;
      }

      if (meData.user.role !== "ADMIN") {
        router.replace("/giris");
        return;
      }

      setUser(meData.user);

      const [unitsRes, staffRes, petitionsRes] = await Promise.all([
        fetch("/api/admin/units", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/staff", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/petitions", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (unitsRes.ok) {
        const unitsData = await unitsRes.json();
        if (unitsData.success && unitsData.units) {
          setUnits(unitsData.units);
        }
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        if (staffData.success && staffData.staff) {
          setStaff(staffData.staff);
        }
      }

      if (petitionsRes.ok) {
        const petitionsData = await petitionsRes.json();
        if (petitionsData.success && petitionsData.petitions) {
          setPetitions(petitionsData.petitions);
        }
      }
    } catch {
      setError("Veriler yüklenirken sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingPage />;
  }

  if (!user) return null;

  const activeUnits = units.filter((u) => u.isActive);
  const activeStaff = staff.filter((s) => s.isActive);
  const pendingPetitions = petitions.filter(
    (p) => p.status === "RECEIVED" || p.status === "ASSIGNED"
  );

  const recentPetitions = [...petitions]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <h1 className="page-title">Yönetici Paneli</h1>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-value">{activeUnits.length}</div>
            <div className="stat-label">Toplam Birim</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{activeStaff.length}</div>
            <div className="stat-label">Toplam Personel</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-value">{petitions.length}</div>
            <div className="stat-label">Toplam Başvuru</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{pendingPetitions.length}</div>
            <div className="stat-label">Bekleyen Başvuru</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions" style={{ marginBottom: 24 }}>
          <Link href="/dashboard/admin/categories" className="quick-action-btn">
            <span className="qa-icon">📂</span>
            <span className="qa-label">Kategori Yönetimi</span>
          </Link>
          <Link href="/dashboard/admin/units" className="quick-action-btn">
            <span className="qa-icon">🏢</span>
            <span className="qa-label">Birim Yönetimi</span>
          </Link>
          <Link href="/dashboard/admin/personel" className="quick-action-btn">
            <span className="qa-icon">👤</span>
            <span className="qa-label">Personel Yönetimi</span>
          </Link>
          <Link href="/dashboard/personel" className="quick-action-btn">
            <span className="qa-icon">📋</span>
            <span className="qa-label">Tüm Başvurular</span>
          </Link>
          <Link href="/dashboard/admin/destek" className="quick-action-btn">
            <span className="qa-icon">🛠️</span>
            <span className="qa-label">Destek Paneli</span>
          </Link>
        </div>

        {/* Units Overview */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">Birimler</span>
            <Link href="/dashboard/admin/units" className="btn btn-outline btn-sm">
              Tümünü Gör
            </Link>
          </div>
          <div className="card-body">
            {activeUnits.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
                Henüz birim bulunmuyor.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {activeUnits.map((unit) => {
                  const unitStaffCount = activeStaff.filter(
                    (s) => s.unit?.id === unit.id
                  ).length;
                  const unitPetitionCount = petitions.filter(
                    (p) => p.targetUnit.id === unit.id
                  ).length;

                  return (
                    <Link
                      key={unit.id}
                      href={`/dashboard/admin/units/${unit.id}/personel`}
                      className="landing-card"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="landing-card-title" style={{ marginBottom: 8 }}>
                        {unit.name}
                      </div>
                      <div
                        className="landing-card-desc"
                        style={{
                          display: "flex",
                          gap: 16,
                          fontSize: 13,
                        }}
                      >
                        <span>
                          <strong>{unitStaffCount}</strong> personel
                        </span>
                        <span>
                          <strong>{unitPetitionCount}</strong> başvuru
                        </span>
                      </div>
                      <span className="landing-card-link">Yönet →</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Petitions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Son Başvurular</span>
            <Link href="/dashboard/personel" className="btn btn-outline btn-sm">
              Tümünü Gör
            </Link>
          </div>
          <div className="card-body">
            {recentPetitions.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
                Henüz başvuru bulunmuyor.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recentPetitions.map((petition) => (
                  <article
                    key={petition.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/dashboard/personel/basvurular/${petition.id}`)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/dashboard/personel/basvurular/${petition.id}`);
                      }
                    }}
                    style={{
                      padding: 16,
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      background: "var(--surface)",
                      cursor: "pointer",
                      transition:
                        "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.borderColor = "#2c5282";
                      event.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(15, 23, 42, 0.08)";
                      event.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.borderColor = "var(--border)";
                      event.currentTarget.style.boxShadow = "none";
                      event.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: "var(--text-muted)",
                            }}
                          >
                            {petition.trackingCode}
                          </span>
                          <span className="cat-badge">{petition.category.name}</span>
                        </div>
                        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
                          {petition.subject}
                        </h3>
                        <p
                          style={{
                            margin: "0 0 6px",
                            color: "var(--text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          Başvuru sahibi:{" "}
                          <strong>
                            {petition.applicantFirstName} {petition.applicantLastName}
                          </strong>
                        </p>
                        <p
                          style={{
                            margin: 0,
                            color: "var(--text-muted)",
                            fontSize: 12,
                          }}
                        >
                          Birim: {petition.targetUnit.name} ·{" "}
                          {formatDate(petition.createdAt)}
                        </p>
                      </div>
                      <div style={{ minWidth: 140, textAlign: "right" }}>
                        <span
                          className={`status-badge ${STATUS_CLASS_MAP[petition.status]}`}
                        >
                          {STATUS_LABELS[petition.status]}
                        </span>
                        <p
                          style={{
                            margin: "8px 0 0",
                            color: "var(--text-muted)",
                            fontSize: 12,
                          }}
                        >
                          {PRIORITY_LABELS[petition.priority]}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek &amp; Öneri Sistemi ©{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function LoadingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
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
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
