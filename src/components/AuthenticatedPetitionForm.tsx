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
  const [step, setStep] = useState(1);
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

  function validateStep(currentStep: number): string | null {
    if (currentStep === 1) {
      if (!form.category) return "Başvuru kategorisini seçin.";
      if (!form.targetUnitCode) return "Hedef birimi seçin.";
    }

    if (currentStep === 2) {
      if (form.subject.trim().length < 5) {
        return "Başvuru konusu en az 5 karakter olmalıdır.";
      }
      if (form.content.trim().length < 20) {
        return "Başvuru içeriği en az 20 karakter olmalıdır.";
      }
    }

    if (currentStep === 3) {
      if (!form.privacyNoticeAcknowledged) {
        return "Aydınlatma metnini okuduğunuzu onaylamalısınız.";
      }
    }

    return null;
  }

  function handleNext() {
    setError("");
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  }

  function handleBack() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateStep(3);
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

  const roleLabel =
    user.role === "ACADEMIC" ? "Akademisyen" : "Öğrenci";

  const selectedCategory = categories.find((c) => c.code === form.category);
  const selectedUnit = units.find((u) => u.code === form.targetUnitCode);

  const stepLabels = ["Konu & Birim", "Mesaj", "Önizleme"];

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

      {/* Kullanıcı bilgi kartı */}
      <div
        style={{
          margin: "20px 24px 0",
          background: "var(--info-bg, #ebf8ff)",
          border: "1px solid #90cdf4",
          borderRadius: "var(--radius, 8px)",
          padding: "16px 20px",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--info, #2b6cb0)", marginBottom: 8 }}>
          Başvuru Sahibi
        </div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          {user.firstName} {user.lastName}
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
          {user.email} · {roleLabel}
        </div>
        {user.studentNumber && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            Öğrenci No: {user.studentNumber}
          </div>
        )}
        {user.department && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            Bölüm: {user.department}
          </div>
        )}
        {user.academicTitle && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            Unvan: {user.academicTitle}
          </div>
        )}
      </div>

      {/* Adım göstergesi */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "20px 24px 0",
        }}
      >
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = step === stepNumber;
          const isDone = step > stepNumber;

          return (
            <div
              key={label}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 8px",
                borderRadius: 8,
                background: isActive
                  ? "var(--primary, #0066cc)"
                  : isDone
                    ? "#e6f4ea"
                    : "#f0f0f0",
                color: isActive ? "#fff" : isDone ? "#2d6a4f" : "#666",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                Adım {stepNumber}
              </div>
              {label}
            </div>
          );
        })}
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

          {(categoriesError || unitsError) && step === 1 && (
            <div
              className="alert alert-error"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              ⚠️ {categoriesError || unitsError}
            </div>
          )}

          {/* Adım 1: Kategori & Birim */}
          {step === 1 && (
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
          )}

          {/* Adım 2: Mesaj */}
          {step === 2 && (
            <>
              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
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
            </>
          )}

          {/* Adım 3: Önizleme */}
          {step === 3 && (
            <>
              <div
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #dee2e6",
                  borderRadius: 8,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>
                  Başvuru Önizlemesi
                </h3>

                <dl style={{ margin: 0, display: "grid", gap: 10 }}>
                  <PreviewRow label="Başvuru Sahibi" value={`${user.firstName} ${user.lastName}`} />
                  <PreviewRow label="E-posta" value={user.email} />
                  <PreviewRow label="Kategori" value={selectedCategory?.name ?? form.category} />
                  <PreviewRow label="Hedef Birim" value={selectedUnit?.name ?? form.targetUnitCode} />
                  {form.phone && <PreviewRow label="Telefon" value={form.phone} />}
                  <PreviewRow label="Konu" value={form.subject} />
                  <PreviewRow label="İçerik" value={form.content} multiline />
                </dl>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
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
            </>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
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
              {step > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleBack}
                  disabled={loading}
                >
                  ← Geri
                </button>
              )}
            </div>

            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={loading}
              >
                İleri →
              </button>
            ) : (
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
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <dt style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>{label}</dt>
      <dd
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 500,
          whiteSpace: multiline ? "pre-wrap" : "nowrap",
          overflow: multiline ? "visible" : "hidden",
          textOverflow: multiline ? "clip" : "ellipsis",
        }}
      >
        {value}
      </dd>
    </div>
  );
}
