"use client";

import { useEffect, useState } from "react";

import type {
  ApiErrorResponse,
  CreatePetitionFormData,
  CreatePetitionRequest,
  CreatePetitionSuccessResponse,
  CategoriesSuccessResponse,
  CategoryOption,
  UnitOption,
} from "@/types/petition";

const PRIVACY_NOTICE_VERSION = "2026-08-01";

const initialForm: CreatePetitionFormData = {
  firstName: "",
  lastName: "",
  tcKimlik: "",
  birthYear: "",
  email: "",
  phone: "",
  category: "",
  targetUnitCode: "",
  subject: "",
  content: "",
  privacyNoticeAcknowledged: false,
};

interface NewPetitionFormProps {
  onSuccess: (message: string) => void;
  onCancel: () => void;
}

export default function NewPetitionForm({
  onSuccess,
  onCancel,
}: NewPetitionFormProps) {
  const [form, setForm] =
    useState<CreatePetitionFormData>(initialForm);

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
          const message =
            "error" in data
              ? data.error
              : "Kategoriler alınamadı.";

          setCategoriesError(message);
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

        console.error(
          "Kategori listesi alınamadı:",
          categoryError instanceof Error
            ? categoryError.message
            : "Bilinmeyen hata"
        );

        setCategoriesError(
          "Kategoriler yüklenemedi. Lütfen formu kapatıp tekrar açın."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      controller.abort();
    };
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
          | {
              success: true;
              units: UnitOption[];
            }
          | ApiErrorResponse;

        if (!response.ok || !data.success) {
          const message =
            "error" in data
              ? data.error
              : "Birimler alınamadı.";

          setUnitsError(message);
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

        console.error(
          "Birim listesi alınamadı:",
          unitError instanceof Error
            ? unitError.message
            : "Bilinmeyen hata"
        );

        setUnitsError(
          "Birimler yüklenemedi. Lütfen formu kapatıp tekrar açın."
        );
      } finally {
        if (!controller.signal.aborted) {
          setUnitsLoading(false);
        }
      }
    }

    void loadUnits();

    return () => {
      controller.abort();
    };
  }, []);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const target = event.target;
    const { name, value } = target;

    if (
      target instanceof HTMLInputElement &&
      target.type === "checkbox"
    ) {
      setForm((currentForm) => ({
        ...currentForm,
        [name]: target.checked,
      }));

      return;
    }

    let normalizedValue = value;

    if (name === "tcKimlik") {
      normalizedValue = value
        .replace(/\D/g, "")
        .slice(0, 11);
    }

    if (name === "birthYear") {
      normalizedValue = value
        .replace(/\D/g, "")
        .slice(0, 4);
    }

    setForm((currentForm) => ({
      ...currentForm,
      [name]: normalizedValue,
    }));
  }

  function validateForm(): string | null {
    const currentYear = new Date().getFullYear();
    const birthYear = Number(form.birthYear);

    if (form.firstName.trim().length < 2) {
      return "Ad alanını eksiksiz doldurun.";
    }

    if (form.lastName.trim().length < 2) {
      return "Soyad alanını eksiksiz doldurun.";
    }

    if (!/^\d{11}$/.test(form.tcKimlik)) {
      return "T.C. kimlik numarası 11 rakamdan oluşmalıdır.";
    }

    if (
      !Number.isInteger(birthYear) ||
      birthYear < 1900 ||
      birthYear > currentYear
    ) {
      return "Geçerli bir doğum yılı girin.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      return "Geçerli bir e-posta adresi girin.";
    }

    if (!form.category) {
      return "Başvuru kategorisini seçin.";
    }

    if (!form.targetUnitCode) {
      return "Hedef birimi seçin.";
    }

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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!form.category) {
      return;
    }

    const requestBody: CreatePetitionRequest = {
      identity: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        tcKimlik: form.tcKimlik,
        birthYear: Number(form.birthYear),
      },
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      category: form.category,
      targetUnitCode: form.targetUnitCode,
      subject: form.subject.trim(),
      content: form.content.trim(),

      /*
       * Gerçek Turnstile bileşeni bağlandığında bu değer,
       * bileşenden alınan gerçek token ile değiştirilecek.
       */
      captchaToken: "development-mock-token",

      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      privacyNoticeAcknowledged:
        form.privacyNoticeAcknowledged,
    };

    setLoading(true);

    try {
      const response = await fetch("/api/petitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as
        | CreatePetitionSuccessResponse
        | ApiErrorResponse;

      if (!response.ok || !data.success) {
        const errorMessage =
          "error" in data
            ? data.error
            : "Başvuru gönderilemedi.";

        setError(errorMessage);
        return;
      }

      onSuccess(data.message);
    } catch (submitError) {
      console.error(
        "Başvuru gönderme isteği başarısız:",
        submitError instanceof Error
          ? submitError.message
          : "Bilinmeyen hata"
      );

      setError(
        "Sunucuya ulaşılamadı. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
    >
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 760 }}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            📝 Yeni Başvuru
          </h2>

          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Başvuru formunu kapat"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
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

            <div
              style={{
                background: "var(--info-bg)",
                border: "1px solid #90cdf4",
                borderRadius: "var(--radius)",
                padding: "12px 16px",
                marginBottom: 20,
                color: "var(--info)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              ℹ️ Kimlik bilgileriniz yalnızca gerçek kişi
              doğrulaması amacıyla kullanılacak; T.C. kimlik
              numaranız ve doğum yılınız sisteme
              kaydedilmeyecektir.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="firstName"
                >
                  Ad <span className="required">*</span>
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  className="form-control"
                  value={form.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="lastName"
                >
                  Soyad <span className="required">*</span>
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  className="form-control"
                  value={form.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="tcKimlik"
                >
                  T.C. Kimlik Numarası{" "}
                  <span className="required">*</span>
                </label>

                <input
                  id="tcKimlik"
                  name="tcKimlik"
                  className="form-control"
                  value={form.tcKimlik}
                  onChange={handleChange}
                  placeholder="11 haneli T.C. kimlik numarası"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="birthYear"
                >
                  Doğum Yılı{" "}
                  <span className="required">*</span>
                </label>

                <input
                  id="birthYear"
                  name="birthYear"
                  className="form-control"
                  value={form.birthYear}
                  onChange={handleChange}
                  placeholder="Örn. 2000"
                  inputMode="numeric"
                  autoComplete="bday-year"
                  maxLength={4}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="email"
                >
                  E-posta <span className="required">*</span>
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="phone"
                >
                  Telefon
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                  autoComplete="tel"
                  maxLength={20}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="divider" />

            {categoriesError && (
              <div
                className="alert alert-error"
                role="alert"
                style={{ marginBottom: 16 }}
              >
                ⚠️ {categoriesError}
              </div>
            )}

            {unitsError && (
              <div
                className="alert alert-error"
                role="alert"
                style={{ marginBottom: 16 }}
              >
                ⚠️ {unitsError}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="category"
                >
                  Kategori <span className="required">*</span>
                </label>

                <select
                  id="category"
                  name="category"
                  className="form-control"
                  value={form.category}
                  onChange={handleChange}
                  disabled={
                    loading ||
                    categoriesLoading ||
                    categories.length === 0
                  }
                >
                  <option value="">
                    {categoriesLoading
                      ? "Kategoriler yükleniyor..."
                      : "Seçiniz..."}
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.code}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="targetUnitCode"
                >
                  Hedef Birim{" "}
                  <span className="required">*</span>
                </label>

                <select
                  id="targetUnitCode"
                  name="targetUnitCode"
                  className="form-control"
                  value={form.targetUnitCode}
                  onChange={handleChange}
                  disabled={
                    loading ||
                    unitsLoading ||
                    units.length === 0
                  }
                >
                  <option value="">
                    {unitsLoading
                      ? "Birimler yükleniyor..."
                      : "Seçiniz..."}
                  </option>

                  {units.map((unit) => (
                    <option
                      key={unit.code}
                      value={unit.code}
                    >
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label
                className="form-label"
                htmlFor="subject"
              >
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
              <label
                className="form-label"
                htmlFor="content"
              >
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
                style={{
                  width: 17,
                  height: 17,
                  marginTop: 3,
                  cursor: "pointer",
                }}
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
                Kişisel Verilerin İşlenmesine İlişkin
                Aydınlatma Metni&apos;ni okudum.{" "}
                <span className="required">*</span>
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onCancel}
                disabled={loading}
              >
                İptal
              </button>

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
    </div>
  );
}