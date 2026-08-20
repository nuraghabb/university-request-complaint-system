"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
}

interface UnitInfo {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface StaffFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "UNIT_MANAGER" | "UNIT_STAFF";
}

const EMPTY_FORM: StaffFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "UNIT_STAFF",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Sistem Yöneticisi",
  UNIT_MANAGER: "Birim Yöneticisi",
  UNIT_STAFF: "Birim Personeli",
};

export default function UnitStaffPage() {
  const router = useRouter();
  const params = useParams();
  const unitId = params.id as string;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [unitInfo, setUnitInfo] = useState<UnitInfo | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<StaffFormData>(EMPTY_FORM);

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const loadStaff = useCallback(async () => {
    const response = await fetch(`/api/units/${unitId}/staff`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Personel listesi alınamadı.");
    }

    setUnitInfo(data.unit);
    setStaffList(data.staff);
  }, [unitId]);

  useEffect(() => {
    let active = true;

    async function initializePage() {
      try {
        setLoading(true);
        setError("");

        const authResponse = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const authData = await authResponse.json();

        if (!authResponse.ok || !authData.success || !authData.user) {
          router.replace("/giris");
          return;
        }

        const role = authData.user.role;
        if (role !== "ADMIN" && role !== "UNIT_MANAGER") {
          router.replace("/dashboard/personel");
          return;
        }

        if (!active) return;

        setUser(authData.user);
        await loadStaff();
      } catch (pageError) {
        if (!active) return;
        setError(
          pageError instanceof Error
            ? pageError.message
            : "Sayfa yüklenirken hata oluştu."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void initializePage();
    return () => {
      active = false;
    };
  }, [loadStaff, router]);

  const handleInputChange = (
    field: keyof StaffFormData,
    value: string
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!firstName || !lastName || !email || !password) {
      setError("Ad, soyad, e-posta ve şifre zorunludur.");
      return;
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    try {
      setSaving(true);
      clearMessages();

      const response = await fetch(`/api/units/${unitId}/staff`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role: form.role,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Personel eklenemedi.");
      }

      setSuccessMessage("Personel başarıyla eklendi.");
      resetForm();
      await loadStaff();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Sunucuya ulaşılamadı."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStaff = async (staffMember: StaffMember) => {
    if (
      !window.confirm(
        `${staffMember.firstName} ${staffMember.lastName} birimden kaldırılsın mı?`
      )
    ) {
      return;
    }

    try {
      setRemovingId(staffMember.id);
      clearMessages();

      const response = await fetch(
        `/api/units/${unitId}/staff/${staffMember.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Personel kaldırılamadı.");
      }

      setSuccessMessage(
        data.message ??
          `${staffMember.firstName} ${staffMember.lastName} birimden kaldırıldı.`
      );
      await loadStaff();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Sunucuya ulaşılamadı."
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
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
            Personel yönetimi yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-wrapper">
      <main className="main-content" style={{ maxWidth: 1100 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
          onClick={() => router.push("/dashboard/admin/units")}
        >
          ← Birimlere Dön
        </button>

        <h2 className="section-title" style={{ marginTop: 0 }}>
          Personel Yönetimi
        </h2>

        {unitInfo && (
          <div
            className="card"
            style={{ marginBottom: 24 }}
          >
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 28,
                  lineHeight: 1,
                }}
              >
                🏢
              </span>
              <div>
                <strong style={{ color: "var(--text-primary)", fontSize: 17 }}>
                  {unitInfo.name}
                </strong>
                <span
                  style={{
                    marginLeft: 10,
                    fontFamily: "monospace",
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  {unitInfo.code}
                </span>
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 12,
                    color: unitInfo.isActive ? "#16a34a" : "var(--text-muted)",
                  }}
                >
                  {unitInfo.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div
            className="alert"
            style={{
              marginBottom: 16,
              background: "#ecfdf5",
              border: "1px solid #86efac",
              color: "#166534",
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">➕ Yeni Personel Ekle</span>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">
                    Ad
                  </label>
                  <input
                    id="firstName"
                    className="form-control"
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      handleInputChange("firstName", event.target.value)
                    }
                    placeholder="Ad"
                    maxLength={100}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">
                    Soyad
                  </label>
                  <input
                    id="lastName"
                    className="form-control"
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      handleInputChange("lastName", event.target.value)
                    }
                    placeholder="Soyad"
                    maxLength={100}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">
                    E-posta
                  </label>
                  <input
                    id="email"
                    className="form-control"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      handleInputChange("email", event.target.value)
                    }
                    placeholder="ornek@mersin.edu.tr"
                    maxLength={255}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Şifre
                  </label>
                  <input
                    id="password"
                    className="form-control"
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      handleInputChange("password", event.target.value)
                    }
                    placeholder="En az 6 karakter"
                    minLength={6}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="role">
                    Rol
                  </label>
                  <select
                    id="role"
                    className="form-control"
                    value={form.role}
                    onChange={(event) =>
                      handleInputChange(
                        "role",
                        event.target.value as "UNIT_MANAGER" | "UNIT_STAFF"
                      )
                    }
                    disabled={saving}
                  >
                    <option value="UNIT_STAFF">Birim Personeli</option>
                    <option value="UNIT_MANAGER">Birim Yöneticisi</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Kaydediliyor..." : "Personel Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">👥 Birim Personeli</span>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              Toplam {staffList.length} personel
            </span>
          </div>

          <div className="card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {staffList.length === 0 ? (
                <div
                  style={{
                    border: "1.5px dashed var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  Bu birimde henüz personel bulunmuyor.
                </div>
              ) : (
                staffList.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "center",
                      flexWrap: "wrap",
                      opacity: member.isActive ? 1 : 0.65,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <strong style={{ color: "var(--text-primary)" }}>
                          {member.firstName} {member.lastName}
                        </strong>

                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--surface-2)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: member.isActive ? "#dcfce7" : "var(--surface-2)",
                            color: member.isActive ? "#16a34a" : "var(--text-muted)",
                          }}
                        >
                          {member.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: "var(--text-muted)",
                        }}
                      >
                        {member.email}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{
                          color: "#dc2626",
                          borderColor: "#fca5a5",
                        }}
                        disabled={removingId === member.id}
                        onClick={() => void handleRemoveStaff(member)}
                      >
                        {removingId === member.id
                          ? "Kaldırılıyor..."
                          : "Kaldır"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
