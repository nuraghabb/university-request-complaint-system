"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SupportRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
type PetitionStatus =
  | "EMAIL_PENDING"
  | "RECEIVED"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "FORWARDED"
  | "ANSWERED"
  | "CLOSED"
  | "REJECTED";

interface Unit {
  id: number;
  code: string;
  name: string;
}

interface SupportRequest {
  id: number;
  message: string;
  status: SupportRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  petition: {
    id: number;
    trackingCode: string;
    subject: string;
    status: PetitionStatus;
    targetUnit: Unit;
    assignedStaff: {
      id: number;
      firstName: string;
      lastName: string;
    } | null;
  };
  requestedBy: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
  supportUnit: Unit | null;
  resolvedBy: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

interface SupportListResponse {
  success: boolean;
  supportRequests?: SupportRequest[];
  error?: string;
}

interface UnitsResponse {
  success: boolean;
  units?: Unit[];
}

interface ResolveResponse {
  success: boolean;
  supportRequest?: SupportRequest;
  error?: string;
}

const STATUS_LABELS: Record<SupportRequestStatus, string> = {
  PENDING: "Beklemede",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminDestekPaneliPage() {
  const router = useRouter();

  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<Record<number, number>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [supportRes, unitsRes] = await Promise.all([
          fetch("/api/admin/support", { credentials: "include" }),
          fetch("/api/public/units", { credentials: "include" }),
        ]);

        const supportData: SupportListResponse = await supportRes.json();
        const unitsData: UnitsResponse = await unitsRes.json();

        if (!supportData.success || !supportData.supportRequests) {
          setError(supportData.error || "Destek talepleri yüklenemedi.");
          return;
        }

        setSupportRequests(supportData.supportRequests);
        if (unitsData.success && unitsData.units) {
          setUnits(unitsData.units);
        }
      } catch {
        setError("Veriler yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleAccept = async (sr: SupportRequest) => {
    const unitId = selectedUnitId[sr.id];
    if (!unitId) {
      alert("Lütfen bir destek birimi seçin.");
      return;
    }

    try {
      setProcessingId(sr.id);

      const response = await fetch(
        `/api/petitions/${sr.petition.id}/support/${sr.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "ACCEPT",
            supportUnitId: unitId,
          }),
        }
      );

      const data: ResolveResponse = await response.json();

      if (!data.success) {
        alert(data.error || "İşlem başarısız.");
        return;
      }

      setSupportRequests((previous) =>
        previous.map((item) =>
          item.id === sr.id
            ? { ...item, ...data.supportRequest, status: "ACCEPTED" as const }
            : item
        )
      );
    } catch {
      alert("İşlem sırasında bir hata oluştu.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (sr: SupportRequest) => {
    if (!confirm("Bu destek talebini reddetmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      setProcessingId(sr.id);

      const response = await fetch(
        `/api/petitions/${sr.petition.id}/support/${sr.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "REJECT" }),
        }
      );

      const data: ResolveResponse = await response.json();

      if (!data.success) {
        alert(data.error || "İşlem başarısız.");
        return;
      }

      setSupportRequests((previous) =>
        previous.map((item) =>
          item.id === sr.id
            ? { ...item, ...data.supportRequest, status: "REJECTED" as const }
            : item
        )
      );
    } catch {
      alert("İşlem sırasında bir hata oluştu.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <main className="main-content">
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div
              className="spinner spinner-dark"
              style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 16px" }}
            />
            <p style={{ color: "var(--text-muted)" }}>Destek talepleri yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <main className="main-content">
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        </main>
      </div>
    );
  }

  const pendingRequests = supportRequests.filter((sr) => sr.status === "PENDING");
  const processedRequests = supportRequests.filter((sr) => sr.status !== "PENDING");

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Destek Talepleri</h1>
          {pendingRequests.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                background: "#fef3c7",
                color: "#92400e",
              }}
            >
              {pendingRequests.length} bekleyen talep
            </span>
          )}
        </div>

        {pendingRequests.length === 0 && processedRequests.length === 0 ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Henüz destek talebi yok</h3>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                Birim personeli başvurular için destek talebi oluşturduğunda burada görünecektir.
              </p>
            </div>
          </div>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                  <span className="card-title">Bekleyen Talepler ({pendingRequests.length})</span>
                </div>
                <div className="card-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {pendingRequests.map((sr) => (
                      <article
                        key={sr.id}
                        style={{
                          padding: 16,
                          border: "1px solid #fbbf24",
                          borderRadius: "var(--radius)",
                          background: "#fffbeb",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 10px",
                                  borderRadius: 9999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: "#fef3c7",
                                  color: "#92400e",
                                }}
                              >
                                Beklemede
                              </span>
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                {formatDate(sr.createdAt)}
                              </span>
                            </div>

                            <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-primary)" }}>
                              {sr.message}
                            </p>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
                              <div>
                                <strong>Talep Eden: </strong>
                                {sr.requestedBy.firstName} {sr.requestedBy.lastName}
                              </div>
                              <div>
                                <strong>Başvuru: </strong>
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/dashboard/personel/basvurular/${sr.petition.id}`)
                                  }
                                  style={{
                                    fontFamily: "monospace",
                                    color: "var(--primary)",
                                    textDecoration: "underline",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    fontSize: 13,
                                  }}
                                >
                                  {sr.petition.trackingCode}
                                </button>
                                <span style={{ marginLeft: 6 }}>{sr.petition.subject}</span>
                              </div>
                              <div>
                                <strong>Hedef Birim: </strong>
                                {sr.petition.targetUnit.name}
                              </div>
                              <div>
                                <strong>Atanan: </strong>
                                {sr.petition.assignedStaff
                                  ? `${sr.petition.assignedStaff.firstName} ${sr.petition.assignedStaff.lastName}`
                                  : "Atanmamış"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 16,
                            paddingTop: 16,
                            borderTop: "1px solid #fde68a",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                          className="sm-flex-row"
                        >
                          <select
                            value={selectedUnitId[sr.id] ?? ""}
                            onChange={(e) =>
                              setSelectedUnitId((previous) => ({
                                ...previous,
                                [sr.id]: Number(e.target.value),
                              }))
                            }
                            disabled={processingId === sr.id}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: "var(--radius)",
                              border: "1px solid var(--border)",
                              fontSize: 14,
                              background: "white",
                            }}
                          >
                            <option value="">Destek birimi seçin...</option>
                            {units.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name}
                              </option>
                            ))}
                          </select>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => void handleAccept(sr)}
                              disabled={processingId === sr.id || !selectedUnitId[sr.id]}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "var(--radius)",
                                border: "none",
                                background: "#16a34a",
                                color: "white",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: processingId === sr.id || !selectedUnitId[sr.id] ? "not-allowed" : "pointer",
                                opacity: processingId === sr.id || !selectedUnitId[sr.id] ? 0.5 : 1,
                              }}
                            >
                              {processingId === sr.id ? "İşleniyor..." : "Kabul Et"}
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleReject(sr)}
                              disabled={processingId === sr.id}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "var(--radius)",
                                border: "none",
                                background: "#dc2626",
                                color: "white",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: processingId === sr.id ? "not-allowed" : "pointer",
                                opacity: processingId === sr.id ? 0.5 : 1,
                              }}
                            >
                              Reddet
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {processedRequests.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">İşlenmiş Talepler ({processedRequests.length})</span>
                </div>
                <div className="card-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {processedRequests.map((sr) => (
                      <article
                        key={sr.id}
                        className="petition-item"
                        style={{
                          padding: 16,
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                          background: "var(--surface)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 10px",
                                  borderRadius: 9999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: sr.status === "ACCEPTED" ? "#dcfce7" : "#fee2e2",
                                  color: sr.status === "ACCEPTED" ? "#166534" : "#991b1b",
                                }}
                              >
                                {STATUS_LABELS[sr.status]}
                              </span>
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                {formatDate(sr.createdAt)}
                              </span>
                            </div>

                            <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-secondary)" }}>
                              {sr.message}
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "var(--text-muted)" }}>
                              <span>
                                <strong>Başvuru: </strong>
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/dashboard/personel/basvurular/${sr.petition.id}`)
                                  }
                                  style={{
                                    fontFamily: "monospace",
                                    color: "var(--primary)",
                                    textDecoration: "underline",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    fontSize: 13,
                                  }}
                                >
                                  {sr.petition.trackingCode}
                                </button>
                              </span>
                              {sr.supportUnit && (
                                <span>
                                  <strong>Birim: </strong>
                                  {sr.supportUnit.name}
                                </span>
                              )}
                              {sr.resolvedBy && (
                                <span>
                                  <strong>Çözen: </strong>
                                  {sr.resolvedBy.firstName} {sr.resolvedBy.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek &amp; Öneri Sistemi © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
