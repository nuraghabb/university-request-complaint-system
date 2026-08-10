"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StaffUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
}

interface Category {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface MeResponse {
  success: boolean;
  user: StaffUser | null;
  error?: string;
}

interface CategoriesResponse {
  success: boolean;
  categories?: Category[];
  error?: string;
}

interface CategoryResponse {
  success: boolean;
  category?: Category;
  error?: string;
}

const emptyForm = {
  code: "",
  name: "",
  description: "",
};

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    const response = await fetch("/api/admin/categories", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = (await response.json()) as CategoriesResponse;

    if (!response.ok || !data.success || !data.categories) {
      throw new Error(data.error || "Kategoriler alınamadı.");
    }

    setCategories(data.categories);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as MeResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.user ||
          data.user.role !== "ADMIN"
        ) {
          router.replace("/dashboard/personel");
          return;
        }

        if (mounted) {
          setUser(data.user);
        }

        await loadCategories();
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Kategori yönetimi yüklenemedi."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      mounted = false;
    };
  }, [loadCategories, router]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setForm({
      code: category.code,
      name: category.name,
      description: category.description ?? "",
    });
    setError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const description = form.description.trim();

    if (!code || !name) {
      setError("Kategori kodu ve adı zorunludur.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/categories/${editingId}`
          : "/api/admin/categories",
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            name,
            description,
          }),
        }
      );

      const data = (await response.json()) as CategoryResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Kategori kaydedilemedi.");
        return;
      }

      setSuccessMessage(
        editingId
          ? "Kategori başarıyla güncellendi."
          : "Kategori başarıyla oluşturuldu."
      );

      resetForm();
      await loadCategories();
    } catch {
      setError("Sunucuya ulaşılamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category: Category) {
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/admin/categories/${category.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !category.isActive,
          }),
        }
      );

      const data = (await response.json()) as CategoryResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Kategori durumu güncellenemedi.");
        return;
      }

      setSuccessMessage(
        category.isActive
          ? "Kategori pasif duruma alındı."
          : "Kategori yeniden aktif edildi."
      );

      await loadCategories();
    } catch {
      setError("Sunucuya ulaşılamadı.");
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        Kategori yönetimi yükleniyor...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-wrapper">
      <header style={{ background: "#fff", borderBottom: "1px solid var(--border)" }}>
        <div style={{
          maxWidth: 1100,
          minHeight: 72,
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18 }}>Kategori Yönetimi</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 12 }}>
              Yalnızca sistem yöneticileri erişebilir.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/dashboard/personel")}
          >
            Personel Paneline Dön
          </button>
        </div>
      </header>

      <main className="main-content" style={{ maxWidth: 1100 }}>
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
            <span className="card-title">
              {editingId ? "✏️ Kategoriyi Düzenle" : "➕ Yeni Kategori"}
            </span>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="code">Kod</label>
                  <input
                    id="code"
                    className="form-control"
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, code: event.target.value }))
                    }
                    placeholder="Örn. ETKINLIK"
                    maxLength={50}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="name">Kategori Adı</label>
                  <input
                    id="name"
                    className="form-control"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Örn. Etkinlik"
                    maxLength={150}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">Açıklama</label>
                <textarea
                  id="description"
                  className="form-control"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={4}
                  disabled={saving}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                {editingId && (
                  <button type="button" className="btn btn-ghost" onClick={resetForm}>
                    İptal
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? "Kaydediliyor..."
                    : editingId
                      ? "Değişiklikleri Kaydet"
                      : "Kategori Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🗂️ Kategoriler</span>
          </div>

          <div className="card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {categories.map((category) => (
                <div
                  key={category.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "center",
                    flexWrap: "wrap",
                    opacity: category.isActive ? 1 : 0.65,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <strong>{category.name}</strong>
                      <code>{category.code}</code>
                      <span>{category.isActive ? "Aktif" : "Pasif"}</span>
                    </div>

                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
                      {category.description || "Açıklama bulunmuyor."}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => startEditing(category)}
                    >
                      Düzenle
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void toggleCategory(category)}
                    >
                      {category.isActive ? "Pasif Yap" : "Aktif Yap"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}