"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Petition {
  id: number;
  trackingCode: string;
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

const STATUS_BADGES: Record<string, string> = {
  EMAIL_PENDING: "status-email-pending",
  RECEIVED: "status-received",
  ASSIGNED: "status-assigned",
  IN_REVIEW: "status-in-review",
  FORWARDED: "status-forwarded",
  ANSWERED: "status-answered",
  CLOSED: "status-closed",
  REJECTED: "status-rejected",
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) {
          router.push("/ogrenci-akademisyen-giris");
          return;
        }
        const data = await response.json();
        setUser(data.user);

        const petResponse = await fetch("/api/petitions", {
          credentials: "include",
        });
        if (petResponse.ok) {
          const petData = await petResponse.json();
          setPetitions(petData.petitions || []);
        }
      } catch {
        router.push("/ogrenci-akademisyen-giris");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const stats = useMemo(
    () => ({
      total: petitions.length,
      processing: petitions.filter((petition) =>
        ["RECEIVED", "ASSIGNED", "IN_REVIEW", "FORWARDED"].includes(
          petition.status
        )
      ).length,
      completed: petitions.filter((petition) =>
        ["ANSWERED", "CLOSED"].includes(petition.status)
      ).length,
    }),
    [petitions]
  );

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
            Panel yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <h1 className="page-title">Öğrenci Paneli</h1>

        <div className="quick-actions">
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => router.push("/dashboard/basvuru-olustur")}
          >
            <span className="qa-icon">➕</span>
            <span className="qa-label">Yeni Başvuru</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => router.push("/basvuru-takip")}
          >
            <span className="qa-icon">🔍</span>
            <span className="qa-label">Başvuru Takip</span>
          </button>
        </div>

        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <StatCard
            icon="📄"
            value={stats.total}
            label="Toplam Başvuru"
          />
          <StatCard
            icon="🔄"
            value={stats.processing}
            label="İşlemde"
          />
          <StatCard
            icon="✅"
            value={stats.completed}
            label="Tamamlanan"
          />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              📄 Başvurularınız ({petitions.length})
            </span>
          </div>

          <div className="card-body">
            {petitions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Henüz başvurunuz bulunmuyor</h3>
                <p>
                  Yeni bir başvuru oluşturmak için &quot;Yeni
                  Başvuru&quot; butonunu kullanın.
                </p>
              </div>
            ) : (
              <div className="petition-list">
                {petitions.map((petition) => (
                  <article
                    key={petition.id}
                    className="petition-item"
                  >
                    <div className="petition-item-left">
                      <div className="petition-tracking">
                        {petition.trackingCode}
                      </div>
                      <div className="petition-subject">
                        {petition.subject}
                      </div>
                      <div className="petition-date">
                        {new Date(
                          petition.createdAt
                        ).toLocaleDateString("tr-TR")}
                      </div>
                    </div>

                    <div className="petition-item-right">
                      <span
                        className={`status-badge ${
                          STATUS_BADGES[petition.status] ??
                          "status-closed"
                        }`}
                      >
                        {STATUS_LABELS[petition.status] ??
                          petition.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
