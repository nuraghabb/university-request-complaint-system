"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Unit = {
  id: number;
  code: string;
  name: string;
  email: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

type UnitFormData = {
  code: string;
  name: string;
  email: string;
  description: string;
};

const EMPTY_FORM: UnitFormData = {
  code: "",
  name: "",
  email: "",
  description: "",
};

export default function AdminUnitsPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);

  const [formData, setFormData] =
    useState<UnitFormData>(EMPTY_FORM);

  const [editingUnit, setEditingUnit] =
    useState<Unit | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionUnitId, setActionUnitId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

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
      throw new Error(
        data.error ?? "Birimler alınamadı."
      );
    }

    setUnits(data.units);
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

        if (
          !authResponse.ok ||
          !authData.success ||
          !authData.user
        ) {
          router.replace("/giris");
          return;
        }

        if (authData.user.role !== "ADMIN") {
          router.replace("/dashboard/personel");
          return;
        }

        if (!active) {
          return;
        }

        setUser(authData.user);

        await loadUnits();
      } catch (pageError) {
        if (!active) {
          return;
        }

        setError(
          pageError instanceof Error
            ? pageError.message
            : "Sayfa yüklenirken hata oluştu."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initializePage();

    return () => {
      active = false;
    };
  }, [loadUnits, router]);

  const handleInputChange = (
    field: keyof UnitFormData,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setEditingUnit(null);
    setFormData(EMPTY_FORM);
  };

  const handleEdit = (unit: Unit) => {
    clearMessages();

    setEditingUnit(unit);

    setFormData({
      code: unit.code,
      name: unit.name,
      email: unit.email ?? "",
      description: unit.description ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    clearMessages();
    resetForm();
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      clearMessages();

      const isEditing = editingUnit !== null;

      const endpoint = isEditing
        ? `/api/admin/units/${editingUnit.id}`
        : "/api/admin/units";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          email: formData.email,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
          "Birim kaydedilirken hata oluştu."
        );
      }

      setSuccessMessage(
        isEditing
          ? "Birim başarıyla güncellendi."
          : "Birim başarıyla oluşturuldu."
      );

      resetForm();

      await loadUnits();
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

  const toggleUnitStatus = async (unit: Unit) => {
    try {
      setActionUnitId(unit.id);
      clearMessages();

      const response = await fetch(
        `/api/admin/units/${unit.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !unit.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
          "Birim durumu güncellenemedi."
        );
      }

      setSuccessMessage(
        unit.isActive
          ? "Birim pasif duruma alındı."
          : "Birim aktif duruma alındı."
      );

      await loadUnits();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Sunucuya ulaşılamadı."
      );
    } finally {
      setActionUnitId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">
            Birim yönetimi yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin")}
          className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Yönetici Paneline Dön
        </button>

        <h1 className="text-2xl font-semibold text-slate-950">
          Birim Yönetimi
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Yalnızca sistem yöneticileri erişebilir.
        </p>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        {user && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            Yönetici:
            <span className="ml-2 font-semibold text-slate-900">
              {user.name}
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            ❌ {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
            ✅ {successMessage}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-950">
              {editingUnit
                ? "✏️ Birimi Düzenle"
                : "➕ Yeni Birim"}
            </h2>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 p-6"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="unit-code"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Birim Kodu
                </label>

                <input
                  id="unit-code"
                  type="text"
                  required
                  maxLength={50}
                  value={formData.code}
                  onChange={(event) =>
                    handleInputChange(
                      "code",
                      event.target.value
                    )
                  }
                  placeholder="Örn. MUHENDISLIK"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="unit-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Birim Adı
                </label>

                <input
                  id="unit-name"
                  type="text"
                  required
                  maxLength={200}
                  value={formData.name}
                  onChange={(event) =>
                    handleInputChange(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="Örn. Mühendislik Fakültesi"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="unit-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Birim E-posta
              </label>

              <input
                id="unit-email"
                type="email"
                maxLength={255}
                value={formData.email}
                onChange={(event) =>
                  handleInputChange(
                    "email",
                    event.target.value
                  )
                }
                placeholder="Örn. muhendislik@mersin.edu.tr"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Birime ait e-posta adresi yoksa boş
                bırakılabilir.
              </p>
            </div>

            <div>
              <label
                htmlFor="unit-description"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Açıklama
              </label>

              <textarea
                id="unit-description"
                rows={5}
                value={formData.description}
                onChange={(event) =>
                  handleInputChange(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Birim hakkında kısa açıklama..."
                className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {editingUnit && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  İptal
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingUnit
                    ? "Değişiklikleri Kaydet"
                    : "Birim Ekle"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-950">
              🏢 Birimler
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Toplam {units.length} birim bulunuyor.
            </p>
          </div>

          <div className="space-y-4 p-6">
            {units.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Henüz birim bulunmuyor.
              </div>
            ) : (
              units.map((unit) => (
                <article
                  key={unit.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {unit.name}
                        </h3>

                        <span className="font-mono text-sm text-slate-600">
                          {unit.code}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${unit.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                            }`}
                        >
                          {unit.isActive
                            ? "Aktif"
                            : "Pasif"}
                        </span>
                      </div>

                      {unit.email && (
                        <p className="mt-3 text-sm text-slate-600">
                          📧 {unit.email}
                        </p>
                      )}

                      {unit.description && (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                          {unit.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(unit)}
                        className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                      >
                        Düzenle
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/admin/units/${unit.id}/personel`
                          )
                        }
                        className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Personel Yönet
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionUnitId === unit.id
                        }
                        onClick={() =>
                          void toggleUnitStatus(unit)
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionUnitId === unit.id
                          ? "İşleniyor..."
                          : unit.isActive
                            ? "Pasif Yap"
                            : "Aktif Yap"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}