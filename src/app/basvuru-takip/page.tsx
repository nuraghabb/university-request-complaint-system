"use client";

import Link from "next/link";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";

type PetitionCategory =
  | "TALEP"
  | "SIKAYET"
  | "BILGI_EDINME"
  | "TESEKKUR"
  | "ONERI";

type PetitionStatus =
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

interface PetitionResponse {
  content: string;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PetitionStatusHistoryItem {
  fromStatus: PetitionStatus | null;
  toStatus: PetitionStatus;
  createdAt: string;
}

interface PetitionTrackingData {
  trackingCode: string;
  category: PetitionCategory;
  status: PetitionStatus;
  priority: PetitionPriority;
  subject: string;
  targetUnitName: string;
  createdAt: string;
  updatedAt: string;
  responses: PetitionResponse[];
  statusHistory: PetitionStatusHistoryItem[];
}

interface PetitionTrackingSuccessResponse {
  success: true;
  petition: PetitionTrackingData;
}

interface PetitionTrackingErrorResponse {
  success: false;
  error: string;
}

const CATEGORY_LABELS: Record<
  PetitionCategory,
  string
> = {
  TALEP: "Talep",
  SIKAYET: "Şikâyet",
  BILGI_EDINME: "Bilgi Edinme",
  TESEKKUR: "Teşekkür",
  ONERI: "Öneri",
};

const STATUS_LABELS: Record<
  PetitionStatus,
  string
> = {
  RECEIVED: "Başvuru Alındı",
  ASSIGNED: "İlgili Personele Atandı",
  IN_REVIEW: "İnceleniyor",
  FORWARDED: "Başka Birime Yönlendirildi",
  ANSWERED: "Cevaplandı",
  CLOSED: "Kapatıldı",
  REJECTED: "Reddedildi",
};

const PRIORITY_LABELS: Record<
  PetitionPriority,
  string
> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function normalizeTrackingCode(
  value: string
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

export default function PetitionTrackingPage() {
  const [trackingCode, setTrackingCode] =
    useState("");
  const [email, setEmail] = useState("");
  const [petition, setPetition] =
    useState<PetitionTrackingData | null>(
      null
    );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] =
    useState(false);

  const canSubmit = useMemo(() => {
    return (
      trackingCode.trim().length >= 6 &&
      isValidEmail(normalizeEmail(email)) &&
      !isLoading
    );
  }, [trackingCode, email, isLoading]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setPetition(null);

    const normalizedTrackingCode =
      normalizeTrackingCode(trackingCode);

    const normalizedEmail =
      normalizeEmail(email);

    if (normalizedTrackingCode.length < 6) {
      setError(
        "Geçerli bir başvuru takip kodu girin."
      );
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Geçerli bir e-posta adresi girin."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/petitions/track/${encodeURIComponent(
          normalizedTrackingCode
        )}?email=${encodeURIComponent(
          normalizedEmail
        )}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = (await response.json()) as
        | PetitionTrackingSuccessResponse
        | PetitionTrackingErrorResponse;

      if (!response.ok || !data.success) {
        setError(
          data.success
            ? "Başvuru bilgileri alınamadı."
            : data.error
        );
        return;
      }

      setPetition(data.petition);
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setTrackingCode("");
    setEmail("");
    setPetition(null);
    setError("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#001f5c] to-[#003087]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
         <p
  className="text-sm font-semibold uppercase tracking-[0.16em]"
  style={{ color: "#f59e0b" }}
>
              Mersin Üniversitesi
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
              Başvuru Takip Sistemi
            </h1>
          </div>

          <Link
            href="/basvuru-misafir"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-700 hover:text-red-700"
          >
            Yeni Başvuru
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <aside>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold text-red-700">
                  Başvurunuzu sorgulayın
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Takip bilgilerinizi girin
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Başvurunuz için oluşturulan
                  takip kodunu ve başvuru
                  sırasında kullandığınız
                  e-posta adresini girin.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                noValidate
              >
                <div>
                  <label
                    htmlFor="trackingCode"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Takip kodu
                  </label>

                  <input
                    id="trackingCode"
                    name="trackingCode"
                    type="text"
                    value={trackingCode}
                    onChange={(event) =>
                      setTrackingCode(
                        normalizeTrackingCode(
                          event.target.value
                        )
                      )
                    }
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={24}
                    placeholder="Örnek: MRS-ABC123"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium uppercase text-slate-950 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    E-posta adresi
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    maxLength={255}
                    placeholder="ornek@eposta.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
                  >
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isLoading
                    ? "Başvuru aranıyor..."
                    : "Başvuruyu Görüntüle"}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-xs leading-5 text-slate-500">
                  Güvenliğiniz için ad, soyad,
                  telefon ve e-posta bilgileriniz
                  takip ekranında gösterilmez.
                </p>
              </div>
            </div>
          </aside>

          <div>
            {!petition ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl font-bold text-red-700">
                    ?
                  </div>

                  <h2 className="mt-5 text-xl font-bold text-slate-950">
                    Başvuru bilgileri burada
                    görüntülenecek
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Takip kodu ve e-posta
                    adresiniz eşleştiğinde
                    başvurunuzun güncel durumu,
                    birimi ve kurum tarafından
                    verilen cevaplar bu alanda
                    gösterilir.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-700">
                        Başvuru takip kodu
                      </p>

                      <p className="mt-1 font-mono text-xl font-bold tracking-wide text-slate-950">
                        {petition.trackingCode}
                      </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-800">
                      {
                        STATUS_LABELS[
                          petition.status
                        ]
                      }
                    </span>
                  </div>

                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Başvuru konusu
                      </p>

                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {petition.subject}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hedef birim
                      </p>

                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {petition.targetUnitName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Başvuru türü
                      </p>

                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {
                          CATEGORY_LABELS[
                            petition.category
                          ]
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Öncelik
                      </p>

                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {
                          PRIORITY_LABELS[
                            petition.priority
                          ]
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Oluşturulma tarihi
                      </p>

                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {formatDate(
                          petition.createdAt
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Son güncelleme
                      </p>

                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {formatDate(
                          petition.updatedAt
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="text-xl font-bold text-slate-950">
                    Başvuru hareketleri
                  </h2>

                  <div className="mt-6 space-y-5">
                    {petition.statusHistory.map(
                      (historyItem, index) => (
                        <div
                          key={`${historyItem.toStatus}-${historyItem.createdAt}-${index}`}
                          className="relative flex gap-4"
                        >
                          <div className="flex flex-col items-center">
                            <span className="mt-1 h-3 w-3 rounded-full bg-red-700" />

                            {index <
                            petition
                              .statusHistory
                              .length -
                              1 ? (
                              <span className="mt-2 h-full min-h-10 w-px bg-slate-200" />
                            ) : null}
                          </div>

                          <div className="pb-4">
                            <p className="font-semibold text-slate-950">
                              {
                                STATUS_LABELS[
                                  historyItem
                                    .toStatus
                                ]
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatDate(
                                historyItem.createdAt
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="text-xl font-bold text-slate-950">
                    Kurum cevapları
                  </h2>

                  {petition.responses.length ===
                  0 ? (
                    <div className="mt-5 rounded-xl bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
                      Başvurunuza henüz başvuru
                      sahibine açık bir cevap
                      eklenmemiştir.
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {petition.responses.map(
                        (response, index) => (
                          <article
                            key={`${response.createdAt}-${index}`}
                            className="rounded-xl border border-slate-200 p-5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="font-semibold text-slate-950">
                                Kurum cevabı
                              </p>

                              {response.isFinal ? (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  Nihai cevap
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                              {response.content}
                            </p>

                            <p className="mt-4 text-xs text-slate-500">
                              {formatDate(
                                response.createdAt
                              )}
                            </p>
                          </article>
                        )
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-700 hover:text-red-700"
                >
                  Başka Bir Başvuru Sorgula
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}