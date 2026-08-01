"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

type PetitionPriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT";

type PetitionCategory =
  | "TALEP"
  | "SIKAYET"
  | "BILGI_EDINME"
  | "TESEKKUR"
  | "ONERI";

interface StaffUser {
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

interface Petition {
  id: number;
  trackingCode: string;
  applicantFirstName: string;
  applicantLastName: string;
  category: PetitionCategory;
  status: PetitionStatus;
  priority: PetitionPriority;
  subject: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

interface MeResponse {
  success: boolean;
  user: StaffUser | null;
  error?: string;
}

interface PetitionsResponse {
  success: boolean;
  petitions?: Petition[];
  error?: string;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: "Sistem Yöneticisi",
  UNIT_MANAGER: "Birim Yöneticisi",
  UNIT_STAFF: "Birim Personeli",
};

const CATEGORY_LABELS: Record<PetitionCategory, string> = {
  TALEP: "Talep",
  SIKAYET: "Şikâyet",
  BILGI_EDINME: "Bilgi Edinme",
  TESEKKUR: "Teşekkür",
  ONERI: "Öneri",
};

const CATEGORY_ICONS: Record<PetitionCategory, string> = {
  TALEP: "📋",
  SIKAYET: "⚠️",
  BILGI_EDINME: "ℹ️",
  TESEKKUR: "🙏",
  ONERI: "💡",
};

const STATUS_LABELS: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "E-posta Bekleniyor",
  RECEIVED: "Alındı",
  ASSIGNED: "Atandı",
  IN_REVIEW: "İnceleniyor",
  FORWARDED: "Yönlendirildi",
  ANSWERED: "Cevaplandı",
  CLOSED: "Kapatıldı",
  REJECTED: "Reddedildi",
};

const PRIORITY_LABELS: Record<PetitionPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export default function PersonelDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<StaffUser | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [petitionsLoading, setPetitionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    PetitionStatus | "ALL"
  >("ALL");

  const fetchPetitions = useCallback(async () => {
    setPetitionsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/petitions", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response.json()) as PetitionsResponse;

      if (response.status === 401 || response.status === 403) {
        router.replace("/giris");
        return;
      }

      if (!response.ok || !data.success || !data.petitions) {
        setError(
          data.error || "Başvurular alınamadı."
        );
        return;
      }

      setPetitions(data.petitions);
    } catch {
      setError(
        "Başvurular yüklenirken sunucuya ulaşılamadı."
      );
    } finally {
      setPetitionsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as MeResponse;

        if (!response.ok || !data.success || !data.user) {
          router.replace("/giris");
          return;
        }

        if (isMounted) {
          setUser(data.user);
        }

        await fetchPetitions();
      } catch {
        if (isMounted) {
          setError(
            "Oturum bilgileri alınamadı. Lütfen tekrar giriş yapın."
          );
        }
      } finally {
        if (isMounted) {
          setSessionLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [fetchPetitions, router]);

  const filteredPetitions = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLocaleLowerCase("tr-TR");

    return petitions.filter((petition) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        petition.status === statusFilter;

      const searchableText = [
        petition.trackingCode,
        petition.applicantFirstName,
        petition.applicantLastName,
        petition.subject,
        petition.targetUnit.name,
        CATEGORY_LABELS[petition.category],
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [petitions, searchText, statusFilter]);

  const stats = useMemo(
    () => ({
      total: petitions.length,
      received: petitions.filter(
        (petition) => petition.status === "RECEIVED"
      ).length,
      processing: petitions.filter((petition) =>
        [
          "ASSIGNED",
          "IN_REVIEW",
          "FORWARDED",
        ].includes(petition.status)
      ).length,
      completed: petitions.filter((petition) =>
        ["ANSWERED", "CLOSED"].includes(petition.status)
      ).length,
    }),
    [petitions]
  );

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/giris");
      router.refresh();
    }
  }

  if (sessionLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-wrapper">
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1240,
            minHeight: 72,
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Mersin Üniversitesi
            </h1>

            <p
              style={{
                margin: "4px 0 0",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              Dilek ve Öneri Yönetim Sistemi
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      <section
        className="page-hero"
        style={{
          background:
            "linear-gradient(135deg, #1a365d 0%, #2c5282 100%)",
        }}
      >
        <div className="page-hero-inner">
          <h1>Personel Yönetim Paneli</h1>

          <p>
            Hoş geldiniz, {user.firstName}{" "}
            {user.lastName}.
          </p>
        </div>
      </section>

      <main className="main-content">
        {error && (
          <div
            className="alert alert-error"
            role="alert"
            style={{ marginBottom: 20 }}
          >
            ⚠️ {error}
          </div>
        )}

        <div
          className="card"
          style={{ marginBottom: 24 }}
        >
          <div className="card-header">
            <span className="card-title">
              👤 Personel Bilgileri
            </span>
          </div>

          <div className="card-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 20,
              }}
            >
              <InfoItem
                label="Ad Soyad"
                value={`${user.firstName} ${user.lastName}`}
              />

              <InfoItem
                label="E-posta"
                value={user.email}
              />

              <InfoItem
                label="Yetki"
                value={ROLE_LABELS[user.role]}
              />

              <InfoItem
                label="Birim"
                value={
                  user.unit?.name ??
                  (user.role === "ADMIN"
                    ? "Tüm birimler"
                    : "Birim atanmamış")
                }
              />
            </div>
          </div>
        </div>

        <div
          className="stats-grid"
          style={{ marginBottom: 24 }}
        >
          <StatCard
            icon="📥"
            value={stats.total}
            label="Toplam Başvuru"
          />

          <StatCard
            icon="🆕"
            value={stats.received}
            label="Yeni Başvuru"
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
          <div
            className="card-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span className="card-title">
              📄 Başvurular
            </span>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={fetchPetitions}
              disabled={petitionsLoading}
            >
              {petitionsLoading
                ? "Yükleniyor..."
                : "Yenile"}
            </button>
          </div>

          <div className="card-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px, 1fr) minmax(180px, 240px)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <input
                type="search"
                className="form-control"
                placeholder="Takip kodu, ad soyad, konu veya birim ara..."
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
              />

              <select
                className="form-control"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | PetitionStatus
                      | "ALL"
                  )
                }
              >
                <option value="ALL">
                  Tüm durumlar
                </option>

                {Object.entries(STATUS_LABELS)
                  .filter(
                    ([status]) =>
                      status !== "EMAIL_PENDING"
                  )
                  .map(([status, label]) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {label}
                    </option>
                  ))}
              </select>
            </div>

            {petitionsLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 16px",
                }}
              >
                <div
                  className="spinner spinner-dark"
                  style={{
                    width: 36,
                    height: 36,
                    borderWidth: 3,
                    margin: "0 auto 14px",
                  }}
                />

                <p
                  style={{
                    color: "var(--text-muted)",
                  }}
                >
                  Başvurular yükleniyor...
                </p>
              </div>
            ) : filteredPetitions.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 46,
                    marginBottom: 12,
                  }}
                >
                  📭
                </div>

                <h2
                  style={{
                    fontSize: 17,
                    marginBottom: 8,
                  }}
                >
                  Başvuru bulunamadı
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  Seçilen ölçütlere uygun bir başvuru
                  bulunmuyor.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {filteredPetitions.map((petition) => (
                  <PetitionCard
                    key={petition.id}
                    petition={petition}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek
        &amp; Öneri Sistemi ©{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function PetitionCard({
  petition,
}: {
  petition: Petition;
}) {
  return (
    <article
      style={{
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--surface)",
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

            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {CATEGORY_ICONS[petition.category]}{" "}
              {CATEGORY_LABELS[petition.category]}
            </span>
          </div>

          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 16,
            }}
          >
            {petition.subject}
          </h2>

          <p
            style={{
              margin: "0 0 6px",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            Başvuru sahibi:{" "}
            <strong>
              {petition.applicantFirstName}{" "}
              {petition.applicantLastName}
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

        <div
          style={{
            minWidth: 160,
            textAlign: "right",
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {STATUS_LABELS[petition.status]}
          </p>

          <p
            style={{
              margin: "0 0 6px",
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            Öncelik:{" "}
            {PRIORITY_LABELS[petition.priority]}
          </p>

          <p
            style={{
              margin: 0,
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            Atanan:{" "}
            {petition.assignedStaff
              ? `${petition.assignedStaff.firstName} ${petition.assignedStaff.lastName}`
              : "Atanmadı"}
          </p>
        </div>
      </div>
    </article>
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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p
        style={{
          margin: "0 0 6px",
          color: "var(--text-muted)",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: 0,
          color: "var(--text)",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {value}
      </p>
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
          Personel paneli yükleniyor...
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