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

type PetitionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface PetitionCategory {
  id: number;
  code: string;
  name: string;
}

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

const STATUS_CLASS: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "status-email-pending",
  RECEIVED: "status-received",
  ASSIGNED: "status-assigned",
  IN_REVIEW: "status-in-review",
  FORWARDED: "status-forwarded",
  ANSWERED: "status-answered",
  CLOSED: "status-closed",
  REJECTED: "status-rejected",
};

export default function BirimPersoneliDashboardPage() {
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
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState("");

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
        setError(data.error || "Başvurular alınamadı.");
        return;
      }

      setPetitions(data.petitions);
    } catch {
      setError("Başvurular yüklenirken sunucuya ulaşılamadı.");
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

        if (data.user.role !== "UNIT_STAFF") {
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

  const handleClaim = useCallback(
    async (petitionId: number) => {
      setClaimingId(petitionId);
      setClaimError("");

      try {
        const response = await fetch(
          `/api/petitions/${petitionId}/claim`,
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as {
          success: boolean;
          error?: string;
        };

        if (response.status === 401 || response.status === 403) {
          router.replace("/giris");
          return;
        }

        if (!response.ok || !data.success) {
          setClaimError(
            data.error || "Görev üstlenilirken bir hata oluştu."
          );
          return;
        }

        await fetchPetitions();
      } catch {
        setClaimError("Görev üstlenilirken sunucuya ulaşılamadı.");
      } finally {
        setClaimingId(null);
      }
    },
    [fetchPetitions, router]
  );

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
        petition.category.name,
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
      unassigned: petitions.filter(
        (petition) =>
          petition.assignedStaff === null &&
          petition.status !== "CLOSED" &&
          petition.status !== "REJECTED"
      ).length,
      myAssigned: petitions.filter(
        (petition) =>
          petition.assignedStaff !== null &&
          petition.assignedStaff.id === user?.id
      ).length,
      completed: petitions.filter((petition) =>
        ["ANSWERED", "CLOSED"].includes(petition.status)
      ).length,
    }),
    [petitions, user]
  );

  if (sessionLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <h1 className="page-title">Birim Personeli Paneli</h1>

        {error && (
          <div
            className="alert alert-error"
            role="alert"
            style={{ marginBottom: 20 }}
          >
            ⚠️ {error}
          </div>
        )}

        {claimError && (
          <div
            className="alert alert-error"
            role="alert"
            style={{ marginBottom: 20 }}
          >
            ⚠️ {claimError}
          </div>
        )}

        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <StatCard
            icon="📥"
            value={stats.total}
            label="Toplam Başvuru"
          />
          <StatCard
            icon="📋"
            value={stats.unassigned}
            label="Atanmamış"
          />
          <StatCard
            icon="👤"
            value={stats.myAssigned}
            label="Benim Atandıklarım"
          />
          <StatCard
            icon="✅"
            value={stats.completed}
            label="Tamamlanan"
          />
        </div>

        <div className="quick-actions" style={{ marginBottom: 24 }}>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() =>
              router.push("/dashboard/basvuru-olustur")
            }
          >
            <span className="qa-icon">➕</span>
            <span className="qa-label">Yeni Başvuru</span>
          </button>
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
              📄 Birim Başvuruları
            </span>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={fetchPetitions}
              disabled={petitionsLoading}
            >
              {petitionsLoading ? "Yükleniyor..." : "Yenile"}
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
                placeholder="Takip kodu, ad soyad veya konu ara..."
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
                <option value="ALL">Tüm durumlar</option>
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
                <p style={{ color: "var(--text-muted)" }}>
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
                    isClaiming={
                      claimingId === petition.id
                    }
                    onOpen={() =>
                      router.push(
                        `/dashboard/birim-personeli/basvurular/${petition.id}`
                      )
                    }
                    onClaim={() =>
                      handleClaim(petition.id)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek
        &amp; Öneri Sistemi © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function PetitionCard({
  petition,
  isClaiming,
  onOpen,
  onClaim,
}: {
  petition: Petition;
  isClaiming: boolean;
  onOpen: () => void;
  onClaim: () => void;
}) {
  const isUnassigned =
    petition.assignedStaff === null &&
    petition.status !== "CLOSED" &&
    petition.status !== "REJECTED";

  return (
    <article
      className="petition-item"
      style={
        isUnassigned
          ? {
              borderLeft: "3px solid var(--warning, #d97706)",
            }
          : undefined
      }
    >
      <div className="petition-item-left">
        <p className="petition-tracking">
          {petition.trackingCode}
        </p>
        <h2 className="petition-subject">
          {petition.subject}
        </h2>
        <div className="petition-meta">
          <span
            className={`status-badge ${STATUS_CLASS[petition.status]}`}
          >
            {STATUS_LABELS[petition.status]}
          </span>
          <span className="cat-badge">
            {petition.category.name}
          </span>
          <span>
            {petition.applicantFirstName}{" "}
            {petition.applicantLastName}
          </span>
          <span>
            Öncelik: {PRIORITY_LABELS[petition.priority]}
          </span>
          {petition.assignedStaff && (
            <span>
              Atanan: {petition.assignedStaff.firstName}{" "}
              {petition.assignedStaff.lastName}
            </span>
          )}
        </div>
        <p className="petition-date">
          {formatDate(petition.createdAt)}
        </p>
      </div>
      <div
        className="petition-item-right"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {isUnassigned && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isClaiming}
            onClick={(event) => {
              event.stopPropagation();
              onClaim();
            }}
            style={{ whiteSpace: "nowrap" }}
          >
            {isClaiming
              ? "Üstleniliyor..."
              : "🏷️ Görevi Üstlen"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onOpen}
        >
          Detayı Aç →
        </button>
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
          Birim personeli paneli yükleniyor...
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
