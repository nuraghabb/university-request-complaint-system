"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Unit = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

type StaffMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  unit: { id: number; code: string; name: string } | null;
};

type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type CreateFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
  unitId: string;
};

type EditFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
  unitId: string;
  isActive: boolean;
};

type Filters = {
  unitId: string;
  role: string;
  search: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Sistem Yöneticisi",
  UNIT_MANAGER: "Birim Yöneticisi",
  UNIT_STAFF: "Birim Personeli",
};

const EMPTY_CREATE_FORM: CreateFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "UNIT_STAFF",
  unitId: "",
};

export default function AdminStaffPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [filters, setFilters] = useState<Filters>({
    unitId: "",
    role: "",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");

  const [createForm, setCreateForm] = useState<CreateFormData>(EMPTY_CREATE_FORM);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "UNIT_STAFF",
    unitId: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const loadUnits = useCallback(async () => {
    const response = await fetch("/api/admin/units", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Birimler alınamadı.");
    }
    setUnits(data.units);
  }, []);

  const loadStaff = useCallback(async (currentFilters: Filters) => {
    const params = new URLSearchParams();
    if (currentFilters.unitId) params.set("unitId", currentFilters.unitId);
    if (currentFilters.role) params.set("role", currentFilters.role);
    if (currentFilters.search.trim()) params.set("search", currentFilters.search.trim());

    const query = params.toString();
    const url = `/api/admin/staff${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Personel listesi alınamadı.");
    }
    setStaffList(data.staff);
  }, []);

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

        if (authData.user.role !== "ADMIN") {
          router.replace("/dashboard/personel");
          return;
        }

        if (!active) return;

        setUser(authData.user);

        await Promise.all([loadUnits(), loadStaff(filters)]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, loadUnits, loadStaff]);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const applyFilters = async () => {
    clearMessages();
    try {
      await loadStaff(filters);
    } catch (filterError) {
      setError(
        filterError instanceof Error
          ? filterError.message
          : "Filtreleme sırasında hata oluştu."
      );
    }
  };

  const applySearch = async () => {
    clearMessages();
    const newFilters = { ...filters, search: searchInput };
    setFilters(newFilters);
    try {
      await loadStaff(newFilters);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Arama sırasında hata oluştu."
      );
    }
  };

  const resetFilters = async () => {
    clearMessages();
    const emptyFilters: Filters = { unitId: "", role: "", search: "" };
    setFilters(emptyFilters);
    setSearchInput("");
    try {
      await loadStaff(emptyFilters);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Filtreler sıfırlanırken hata oluştu."
      );
    }
  };

  const handleCreateInputChange = (field: keyof CreateFormData, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = createForm.firstName.trim();
    const lastName = createForm.lastName.trim();
    const email = createForm.email.trim();
    const password = createForm.password;

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

      const body: Record<string, unknown> = {
        firstName,
        lastName,
        email,
        password,
        role: createForm.role,
      };

      if (createForm.unitId) {
        body.unitId = Number(createForm.unitId);
      }

      const response = await fetch("/api/admin/staff", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Personel oluşturulamadı.");
      }

      setSuccessMessage("Personel başarıyla oluşturuldu.");
      setCreateForm(EMPTY_CREATE_FORM);
      await loadStaff(filters);
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

  const startEditing = (staff: StaffMember) => {
    clearMessages();
    setEditingStaff(staff);
    setEditForm({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      password: "",
      role: staff.role,
      unitId: staff.unit ? String(staff.unit.id) : "",
      isActive: staff.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditing = () => {
    clearMessages();
    setEditingStaff(null);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStaff) return;

    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();
    const email = editForm.email.trim();

    if (!firstName || !lastName || !email) {
      setError("Ad, soyad ve e-posta zorunludur.");
      return;
    }

    try {
      setSaving(true);
      clearMessages();

      const body: Record<string, unknown> = {
        firstName,
        lastName,
        email,
        role: editForm.role,
        isActive: editForm.isActive,
      };

      if (editForm.password) {
        body.password = editForm.password;
      }

      if (editForm.unitId) {
        body.unitId = Number(editForm.unitId);
      } else {
        body.unitId = null;
      }

      const response = await fetch(
        `/api/admin/staff/${editingStaff.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Personel güncellenemedi.");
      }

      setSuccessMessage("Personel başarıyla güncellendi.");
      setEditingStaff(null);
      await loadStaff(filters);
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

  const toggleStaffStatus = async (staff: StaffMember) => {
    try {
      setTogglingId(staff.id);
      clearMessages();

      const response = await fetch(
        `/api/admin/staff/${staff.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !staff.isActive }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Personel durumu güncellenemedi."
        );
      }

      setSuccessMessage(
        staff.isActive
          ? `${staff.firstName} ${staff.lastName} pasif duruma alındı.`
          : `${staff.firstName} ${staff.lastName} aktif duruma alındı.`
      );
      await loadStaff(filters);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Sunucuya ulaşılamadı."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const deactivateStaff = async (staff: StaffMember) => {
    if (
      !window.confirm(
        `${staff.firstName} ${staff.lastName} pasif duruma alınsın mı?`
      )
    ) {
      return;
    }

    try {
      setActionId(staff.id);
      clearMessages();

      const response = await fetch(
        `/api/admin/staff/${staff.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Personel pasifleştirilemedi.");
      }

      setSuccessMessage(
        data.message ??
          `${staff.firstName} ${staff.lastName} pasif duruma alındı.`
      );
      await loadStaff(filters);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Sunucuya ulaşılamadı."
      );
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <main
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
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className="page-wrapper">
      <main className="main-content" style={{ maxWidth: 1200 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
          onClick={() => router.push("/dashboard/admin")}
        >
          ← Yönetici Paneline Dön
        </button>

        <h2 className="section-title" style={{ marginTop: 0 }}>
          Personel Yönetimi
        </h2>

        {error && (
          <div
            className="alert alert-error"
            role="alert"
            style={{ marginBottom: 16 }}
          >
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
            <span className="card-title">
              {editingStaff
                ? "✏️ Personeli Düzenle"
                : "➕ Yeni Personel Ekle"}
            </span>
          </div>

          <div className="card-body">
            {editingStaff ? (
              <form onSubmit={handleEditSubmit}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-firstName">
                      Ad
                    </label>
                    <input
                      id="edit-firstName"
                      className="form-control"
                      type="text"
                      required
                      maxLength={100}
                      value={editForm.firstName}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-lastName">
                      Soyad
                    </label>
                    <input
                      id="edit-lastName"
                      className="form-control"
                      type="text"
                      required
                      maxLength={100}
                      value={editForm.lastName}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-email">
                      E-posta
                    </label>
                    <input
                      id="edit-email"
                      className="form-control"
                      type="email"
                      required
                      maxLength={255}
                      value={editForm.email}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-password">
                      Şifre (değiştirmek için doldurun)
                    </label>
                    <input
                      id="edit-password"
                      className="form-control"
                      type="password"
                      minLength={6}
                      value={editForm.password}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="En az 6 karakter"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-role">
                      Rol
                    </label>
                    <select
                      id="edit-role"
                      className="form-control"
                      value={editForm.role}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          role: event.target.value as EditFormData["role"],
                        }))
                      }
                      disabled={saving}
                    >
                      <option value="ADMIN">Sistem Yöneticisi</option>
                      <option value="UNIT_MANAGER">Birim Yöneticisi</option>
                      <option value="UNIT_STAFF">Birim Personeli</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-unit">
                      Birim
                    </label>
                    <select
                      id="edit-unit"
                      className="form-control"
                      value={editForm.unitId}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          unitId: event.target.value,
                        }))
                      }
                      disabled={saving}
                    >
                      <option value="">Birimsiz</option>
                      {units
                        .filter((u) => u.isActive)
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-isActive">
                      Durum
                    </label>
                    <select
                      id="edit-isActive"
                      className="form-control"
                      value={editForm.isActive ? "true" : "false"}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          isActive: event.target.value === "true",
                        }))
                      }
                      disabled={saving}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={saving}
                    onClick={cancelEditing}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateSubmit}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="create-firstName">
                      Ad
                    </label>
                    <input
                      id="create-firstName"
                      className="form-control"
                      type="text"
                      required
                      maxLength={100}
                      value={createForm.firstName}
                      onChange={(event) =>
                        handleCreateInputChange(
                          "firstName",
                          event.target.value
                        )
                      }
                      placeholder="Ad"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="create-lastName">
                      Soyad
                    </label>
                    <input
                      id="create-lastName"
                      className="form-control"
                      type="text"
                      required
                      maxLength={100}
                      value={createForm.lastName}
                      onChange={(event) =>
                        handleCreateInputChange(
                          "lastName",
                          event.target.value
                        )
                      }
                      placeholder="Soyad"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="create-email">
                      E-posta
                    </label>
                    <input
                      id="create-email"
                      className="form-control"
                      type="email"
                      required
                      maxLength={255}
                      value={createForm.email}
                      onChange={(event) =>
                        handleCreateInputChange(
                          "email",
                          event.target.value
                        )
                      }
                      placeholder="ornek@mersin.edu.tr"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="create-password">
                      Şifre
                    </label>
                    <input
                      id="create-password"
                      className="form-control"
                      type="password"
                      required
                      minLength={6}
                      value={createForm.password}
                      onChange={(event) =>
                        handleCreateInputChange(
                          "password",
                          event.target.value
                        )
                      }
                      placeholder="En az 6 karakter"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="create-role">
                      Rol
                    </label>
                    <select
                      id="create-role"
                      className="form-control"
                      value={createForm.role}
                      onChange={(event) =>
                        handleCreateInputChange(
                          "role",
                          event.target.value as CreateFormData["role"]
                        )
                      }
                      disabled={saving}
                    >
                      <option value="ADMIN">Sistem Yöneticisi</option>
                      <option value="UNIT_MANAGER">Birim Yöneticisi</option>
                      <option value="UNIT_STAFF">Birim Personeli</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="create-unit">
                      Birim
                    </label>
                    <select
                      id="create-unit"
                      className="form-control"
                      value={createForm.unitId}
                      onChange={(event) =>
                        handleCreateInputChange(
                          "unitId",
                          event.target.value
                        )
                      }
                      disabled={saving}
                    >
                      <option value="">Birim Seçin (isteğe bağlı)</option>
                      {units
                        .filter((u) => u.isActive)
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 8,
                  }}
                >
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Kaydediliyor..." : "Personel Ekle"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">🔍 Filtreler</span>
          </div>
          <div className="card-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                alignItems: "end",
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="filter-search">
                  Ara
                </label>
                <input
                  id="filter-search"
                  className="form-control"
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void applySearch();
                    }
                  }}
                  placeholder="Ad, soyad veya e-posta"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="filter-unit">
                  Birim
                </label>
                <select
                  id="filter-unit"
                  className="form-control"
                  value={filters.unitId}
                  onChange={(event) =>
                    handleFilterChange("unitId", event.target.value)
                  }
                >
                  <option value="">Tüm Birimler</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="filter-role">
                  Rol
                </label>
                <select
                  id="filter-role"
                  className="form-control"
                  value={filters.role}
                  onChange={(event) =>
                    handleFilterChange("role", event.target.value)
                  }
                >
                  <option value="">Tüm Roller</option>
                  <option value="ADMIN">Sistem Yöneticisi</option>
                  <option value="UNIT_MANAGER">Birim Yöneticisi</option>
                  <option value="UNIT_STAFF">Birim Personeli</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void applyFilters()}
                >
                  Filtrele
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void resetFilters()}
                >
                  Sıfırla
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">👥 Tüm Personel</span>
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
                  Kriterlere uygun personel bulunamadı.
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
                    <div style={{ flex: 1, minWidth: 260 }}>
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
                            background:
                              member.role === "ADMIN"
                                ? "rgba(200, 16, 46, 0.12)"
                                : member.role === "UNIT_MANAGER"
                                  ? "rgba(180, 83, 9, 0.12)"
                                  : "rgba(0, 48, 135, 0.08)",
                            color:
                              member.role === "ADMIN"
                                ? "#c53030"
                                : member.role === "UNIT_MANAGER"
                                  ? "#b45309"
                                  : "var(--primary)",
                          }}
                        >
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: member.isActive
                              ? "#dcfce7"
                              : "var(--surface-2)",
                            color: member.isActive
                              ? "#16a34a"
                              : "var(--text-muted)",
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

                      {member.unit && (
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 12,
                            color: "var(--text-muted)",
                          }}
                        >
                          🏢 {member.unit.name}
                          <span
                            style={{
                              fontFamily: "monospace",
                              marginLeft: 6,
                              opacity: 0.7,
                            }}
                          >
                            ({member.unit.code})
                          </span>
                        </p>
                      )}

                      {!member.unit && (
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 12,
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          Birim atanmamış
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={actionId === member.id || togglingId === member.id}
                        onClick={() => startEditing(member)}
                      >
                        Düzenle
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={actionId === member.id || togglingId === member.id}
                        onClick={() => void toggleStaffStatus(member)}
                      >
                        {togglingId === member.id
                          ? "İşleniyor..."
                          : member.isActive
                            ? "Pasif Yap"
                            : "Aktif Yap"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{
                          color: "#dc2626",
                          borderColor: "#fca5a5",
                        }}
                        disabled={actionId === member.id || togglingId === member.id}
                        onClick={() => void deactivateStaff(member)}
                      >
                        {actionId === member.id
                          ? "İşleniyor..."
                          : "Sil"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek ve Öneri Yönetim
        Sistemi
      </footer>
    </div>
  );
}
