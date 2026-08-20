"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

type SupportRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

interface PetitionNote {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface SupportRequest {
  id: number;
  message: string;
  status: SupportRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  requestedBy: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
  supportUnit: {
    id: number;
    code: string;
    name: string;
  } | null;
}

interface PetitionResponse {
  id: number;
  content: string;
  visibility: "INTERNAL" | "APPLICANT";
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface PetitionDetail {
  id: number;
  trackingCode: string;
  applicantFirstName: string;
  applicantLastName: string;
  applicantEmail?: string;
  applicantPhone?: string | null;
  category: { id: number; code: string; name: string };
  status: PetitionStatus;
  priority: PetitionPriority;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt?: string | null;
  targetUnit: { id: number; code: string; name: string };
  assignedStaff: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  notes: PetitionNote[];
  supportRequests: SupportRequest[];
  responses: PetitionResponse[];
}

interface PetitionDetailResponse {
  success: boolean;
  petition?: PetitionDetail;
  error?: string;
}

interface NotesResponse {
  success: boolean;
  notes?: PetitionNote[];
  error?: string;
}

interface NoteCreateResponse {
  success: boolean;
  note?: PetitionNote;
  error?: string;
}

interface SupportCreateResponse {
  success: boolean;
  supportRequest?: SupportRequest;
  error?: string;
}

const STATUS_LABELS: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "E-posta Bekleniyor",
  RECEIVED: "Başvuru Alındı",
  ASSIGNED: "Personele Atandı",
  IN_REVIEW: "İnceleniyor",
  FORWARDED: "Yönlendirildi",
  ANSWERED: "Cevaplandı",
  CLOSED: "Kapatıldı",
  REJECTED: "Reddedildi",
};

const STATUS_STYLES: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "bg-slate-100 text-slate-700",
  RECEIVED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  FORWARDED: "bg-purple-100 text-purple-800",
  ANSWERED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-100 text-slate-700",
  REJECTED: "bg-red-100 text-red-800",
};

const PRIORITY_LABELS: Record<PetitionPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OgrenciBasvuruDetayPage() {
  const params = useParams<{ id: string }>();

  const petitionId = params.id;

  const [petition, setPetition] =
    useState<PetitionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [chatNotes, setChatNotes] = useState<PetitionNote[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const [supportMessage, setSupportMessage] = useState("");
  const [supportSending, setSupportSending] = useState(false);

  const loadPetition = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/petitions/${petitionId}`,
        { credentials: "include" }
      );

      const data: PetitionDetailResponse = await response.json();

      if (!data.success || !data.petition) {
        setError(data.error || "Başvuru yüklenemedi.");
        return;
      }

      setPetition(data.petition);
      setChatNotes(data.petition.notes ?? []);
    } catch {
      setError("Başvuru yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (petitionId) {
      void loadPetition();
    }
  }, [petitionId]);

  const handleSendChatNote = async () => {
    if (!chatInput.trim() || chatSending) return;

    try {
      setChatSending(true);

      const response = await fetch(
        `/api/petitions/${petitionId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: chatInput.trim() }),
        }
      );

      const data: NoteCreateResponse = await response.json();

      if (!data.success || !data.note) {
        alert(data.error || "Not gönderilemedi.");
        return;
      }

      setChatNotes((previous) => [...previous, data.note!]);
      setChatInput("");
    } catch {
      alert("Not gönderilirken bir hata oluştu.");
    } finally {
      setChatSending(false);
    }
  };

  const handleSupportRequest = async () => {
    if (!supportMessage.trim() || supportSending) return;

    try {
      setSupportSending(true);

      const response = await fetch(
        `/api/petitions/${petitionId}/support`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: supportMessage.trim() }),
        }
      );

      const data: SupportCreateResponse = await response.json();

      if (!data.success) {
        alert(data.error || "Destek talebi gönderilemedi.");
        return;
      }

      setSupportMessage("");
      alert("Destek talebiniz başarıyla oluşturuldu.");
      void loadPetition();
    } catch {
      alert("Destek talebi gönderilirken bir hata oluştu.");
    } finally {
      setSupportSending(false);
    }
  };

  const applicantResponses = petition?.responses?.filter(
    (r) => r.visibility === "APPLICANT"
  );

  if (loading) {
    return (
      <div className="page-container flex min-h-screen items-center justify-center">
        <div className="page-loading">Başvuru yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex min-h-screen items-center justify-center">
        <div className="page-error">{error}</div>
      </div>
    );
  }

  if (!petition) {
    return (
      <div className="page-container flex min-h-screen items-center justify-center">
        <div className="page-empty">Başvuru bulunamadı.</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <main className="page-main">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                STATUS_STYLES[petition.status] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {STATUS_LABELS[petition.status] ?? petition.status}
            </span>
            <span className="text-sm text-slate-500">
              {PRIORITY_LABELS[petition.priority]}
            </span>
          </div>

          <h1 className="page-title mt-4">
            {petition.subject}
          </h1>

          <p className="page-subtitle">
            Takip Kodu:{" "}
            <span className="font-mono font-bold text-slate-900">
              {petition.trackingCode}
            </span>
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-950 uppercase tracking-wide">
                Başvuru Belgesi
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Takip Kodu</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">{petition.trackingCode}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kategori</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{petition.category.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hedef Birim</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{petition.targetUnit.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Oluşturulma</p>
                  <p className="mt-1 text-sm text-slate-700">{formatDate(petition.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Son Güncelleme</p>
                  <p className="mt-1 text-sm text-slate-700">{formatDate(petition.updatedAt)}</p>
                </div>
              </div>

              <div className="py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Konu</p>
                <p className="text-base font-bold text-slate-950">{petition.subject}</p>
              </div>

              <div className="py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Başvuru İçeriği</p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{petition.content}</p>
              </div>
            </div>
          </section>

          {applicantResponses && applicantResponses.length > 0 && (
            <section className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <h2 className="font-semibold text-green-950">
                Müdürlükten Yanıt
              </h2>

              <div className="mt-4 space-y-4">
                {applicantResponses.map((response) => (
                  <div
                    key={response.id}
                    className="rounded-xl border border-green-200 bg-white p-4"
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                      {response.content}
                    </p>

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        {response.author.firstName}{" "}
                        {response.author.lastName}
                      </span>
                      <span>
                        {formatDate(response.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {petition.supportRequests.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-950">
                Destek Talepleri
              </h2>

              <div className="mt-4 space-y-3">
                {petition.supportRequests.map((sr) => (
                  <div
                    key={sr.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-sm text-slate-800">
                      {sr.message}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          sr.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : sr.status === "ACCEPTED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sr.status === "PENDING"
                          ? "Beklemede"
                          : sr.status === "ACCEPTED"
                            ? "Kabul Edildi"
                            : "Reddedildi"}
                      </span>
                      {sr.supportUnit && (
                        <span>{sr.supportUnit.name}</span>
                      )}
                      <span>{formatDate(sr.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Soru & Talep Gönder
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Başvurunuzla ilgili ek bilgi veya taleplerinizi buradan iletebilirsiniz.
            </p>

            <div className="mt-4">
              <textarea
                rows={3}
                maxLength={2000}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                disabled={supportSending}
                placeholder="Mesajınızı yazın..."
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSupportRequest()}
              disabled={supportSending || !supportMessage.trim()}
              className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {supportSending ? "Gönderiliyor..." : "Gönder"}
            </button>
          </section>

          {petition.notes.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-950">
                Başvuru Notları
              </h2>

              <div className="mt-4 space-y-3">
                {petition.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-sm text-slate-800">
                      {note.content}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        {note.author.firstName}{" "}
                        {note.author.lastName}
                      </span>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
