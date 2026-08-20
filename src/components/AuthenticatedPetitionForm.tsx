"use client";

import { useEffect, useState } from "react";

import type {
  ApiErrorResponse,
  AuthenticatedCreatePetitionRequest,
  AuthenticatedCreatePetitionSuccessResponse,
  AuthenticatedPetitionFormData,
  AuthenticatedUserProfile,
  CategoriesSuccessResponse,
  CategoryOption,
  UnitOption,
} from "@/types/petition";

const PRIVACY_NOTICE_VERSION = "2026-08-01";

const initialForm: AuthenticatedPetitionFormData = {
  phone: "",
  category: "",
  targetUnitCode: "",
  subject: "",
  content: "",
  privacyNoticeAcknowledged: false,
};

interface AuthenticatedPetitionFormProps {
  user: AuthenticatedUserProfile;
  onSuccess: (message: string, trackingCode: string) => void;
  onCancel?: () => void;
}

export default function AuthenticatedPetitionForm({
  user,
  onSuccess,
  onCancel,
}: AuthenticatedPetitionFormProps) {
  const [form, setForm] = useState<AuthenticatedPetitionFormData>(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories(): Promise<void> {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const response = await fetch("/api/categories", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        const data = (await response.json()) as
          | CategoriesSuccessResponse
          | ApiErrorResponse;

        if (!response.ok || !data.success) {
          setCategoriesError(
            "error" in data ? data.error : "Kategoriler alınamadı."
          );
          return;
        }

        setCategories(data.categories);
      } catch (categoryError) {
        if (
          categoryError instanceof DOMException &&
          categoryError.name === "AbortError"
        ) {
          return;
        }
        setCategoriesError("Kategoriler yüklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadCategories();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUnits(): Promise<void> {
      setUnitsLoading(true);
      setUnitsError("");

      try {
        const response = await fetch("/api/public/units", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        const data = (await response.json()) as
          | { success: true; units: UnitOption[] }
          | ApiErrorResponse;

        if (!response.ok || !data.success) {
          setUnitsError(
            "error" in data ? data.error : "Birimler alınamadı."
          );
          return;
        }

        setUnits(data.units);
      } catch (unitError) {
        if (
          unitError instanceof DOMException &&
          unitError.name === "AbortError"
        ) {
          return;
        }
        setUnitsError("Birimler yüklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setUnitsLoading(false);
        }
      }
    }

    void loadUnits();
    return () => controller.abort();
  }, []);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const target = event.target;
    const { name, value } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm((current) => ({
        ...current,
        [name]: target.checked,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function validate(): string | null {
    if (!form.category) return "Başvuru kategorisini seçin.";
    if (!form.targetUnitCode) return "Hedef birimi seçin.";
    if (form.subject.trim().length < 5) {
      return "Başvuru konusu en az 5 karakter olmalıdır.";
    }
    if (form.content.trim().length < 20) {
      return "Başvuru içeriği en az 20 karakter olmalıdır.";
    }
    if (!form.privacyNoticeAcknowledged) {
      return "Aydınlatma metnini okuduğunuzu onaylamalısınız.";
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const requestBody: AuthenticatedCreatePetitionRequest = {
      phone: form.phone.trim() || undefined,
      category: form.category,
      targetUnitCode: form.targetUnitCode,
      subject: form.subject.trim(),
      content: form.content.trim(),
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      privacyNoticeAcknowledged: form.privacyNoticeAcknowledged,
    };

    setLoading(true);

    try {
      const response = await fetch("/api/petitions/authenticated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as
        | AuthenticatedCreatePetitionSuccessResponse
        | ApiErrorResponse;

      if (!response.ok || !data.success) {
        setError("error" in data ? data.error : "Başvuru gönderilemedi.");
        return;
      }

      onSuccess(data.message, data.trackingCode);
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ padding: "24px 24px 0" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>
          Yeni Başvuru
        </h2>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>
          Oturum bilgileriniz otomatik olarak kullanılacaktır.
        </p>
      </div>

      <div style={{ padding: 24 }}>
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              className="alert alert-error"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              ⚠️ {error}
            </div>
          )}

          {(categoriesError || unitsError) && (
            <div
              className="alert alert-error"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              ⚠️ {categoriesError || unitsError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div className="form-group">
              <label className="form-label" htmlFor="category">
                Kategori <span className="required">*</span>
              </label>
              <select
                id="category"
                name="category"
                className="form-control"
                value={form.category}
                onChange={handleChange}
                disabled={loading || categoriesLoading}
              >
                <option value="">
                  {categoriesLoading ? "Yükleniyor..." : "Seçiniz..."}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="targetUnitCode">
                Hedef Birim <span className="required">*</span>
              </label>
              <select
                id="targetUnitCode"
                name="targetUnitCode"
                className="form-control"
                value={form.targetUnitCode}
                onChange={handleChange}
                disabled={loading || unitsLoading}
              >
                <option value="">
                  {unitsLoading ? "Yükleniyor..." : "Seçiniz..."}
                </option>
                {units.map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="phone">
              Telefon (isteğe bağlı)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="form-control"
              value={form.phone}
              onChange={handleChange}
              placeholder="05XX XXX XX XX"
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="subject">
              Konu <span className="required">*</span>
            </label>
            <input
              id="subject"
              name="subject"
              className="form-control"
              value={form.subject}
              onChange={handleChange}
              placeholder="Başvurunuzun konusunu kısaca belirtin"
              maxLength={500}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="content">
              İçerik <span className="required">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              className="form-control"
              value={form.content}
              onChange={handleChange}
              placeholder="Başvurunuzun detaylarını açıklayın..."
              rows={6}
              disabled={loading}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginTop: 16,
              marginBottom: 22,
            }}
          >
            <input
              id="privacyNoticeAcknowledged"
              name="privacyNoticeAcknowledged"
              type="checkbox"
              checked={form.privacyNoticeAcknowledged}
              onChange={handleChange}
              disabled={loading}
              style={{ width: 17, height: 17, marginTop: 3, cursor: "pointer" }}
            />
            <label
              htmlFor="privacyNoticeAcknowledged"
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                lineHeight: 1.5,
                cursor: "pointer",
              }}
            >
              Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni&apos;ni
              okudum. <span className="required">*</span>
            </label>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 8,
            }}
          >
            {onCancel && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onCancel}
                disabled={loading}
              >
                İptal
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Gönderiliyor...
                </>
              ) : (
                "📤 Başvuruyu Gönder"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
