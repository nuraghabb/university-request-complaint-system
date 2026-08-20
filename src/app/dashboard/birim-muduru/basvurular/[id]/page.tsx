"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type StaffRole = "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";

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

interface StaffUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  unit: {
    id: number;
    code: string;
    name: string;
  } | null;
}

interface AssignableStaff {
  id: number;
  firstName: string;
  lastName: string;
  role: StaffRole;
  unitId: number | null;
}

interface PetitionNote {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role: StaffRole;
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
    role: StaffRole;
  };
  supportUnit: {
    id: number;
    code: string;
    name: string;
  } | null;
  resolvedBy: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

interface PetitionDetail {
  id: number;
  trackingCode: string;

  applicantFirstName: string;
  applicantLastName: string;
  applicantEmail?: string;
  applicantPhone?: string | null;

  category: {
    id: number;
    code: string;
    name: string;
  };

  status: PetitionStatus;
  priority: PetitionPriority;

  subject: string;
  content: string;

  createdAt: string;
  updatedAt: string;
  emailVerifiedAt?: string | null;

  targetUnit: {
    id: number;
    code: string;
    name: string;
  };

  assignedStaff: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;

  notes: PetitionNote[];
  supportRequests: SupportRequest[];
  responses: PetitionResponse[];
}

interface MeResponse {
  success: boolean;
  user: StaffUser | null;
  error?: string;
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

interface StaffListResponse {
  success: boolean;
  unit?: {
    id: number;
    code: string;
    name: string;
  };
  staff?: AssignableStaff[];
  error?: string;
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
    role: StaffRole;
  };
}

interface RespondCreateResponse {
  success: boolean;
  response?: PetitionResponse;
  petitionStatus?: PetitionStatus;
  error?: string;
}

interface ClaimResponse {
  success: boolean;
  message?: string;
  petition?: {
    id: number;
    trackingCode: string;
    subject: string;
    status: PetitionStatus;
    priority: PetitionPriority;
    updatedAt: string;
    targetUnit: {
      id: number;
      code: string;
      name: string;
    };
    assignedStaff: {
      id: number;
      firstName: string;
      lastName: string;
    } | null;
  };
  error?: string;
}

interface CloseResponse {
  success: boolean;
  message?: string;
  petition?: {
    id: number;
    trackingCode: string;
    subject: string;
    status: PetitionStatus;
    priority: PetitionPriority;
    updatedAt: string;
    targetUnit: {
      id: number;
      code: string;
      name: string;
    };
  };
  error?: string;
}

interface UpdatePetitionResponse {
  success: boolean;
  message?: string;
  petition?: {
    id: number;
    trackingCode: string;
    status: PetitionStatus;
    priority: PetitionPriority;
    updatedAt: string;
    targetUnit: {
      id: number;
      code: string;
      name: string;
    };
    assignedStaff: {
      id: number;
      firstName: string;
      lastName: string;
    } | null;
  };
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

const PRIORITY_LABELS: Record<PetitionPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

const ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: "Sistem Yöneticisi",
  UNIT_MANAGER: "Birim Yöneticisi",
  UNIT_STAFF: "Birim Personeli",
};

const SUPPORT_STATUS_LABELS: Record<
  SupportRequestStatus,
  string
> = {
  PENDING: "Beklemede",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

const SUPPORT_STATUS_STYLES: Record<
  SupportRequestStatus,
  string
> = {
  PENDING:
    "rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800",
  ACCEPTED:
    "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800",
  REJECTED:
    "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PetitionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const petitionId = params.id;

  const [currentUser, setCurrentUser] =
    useState<StaffUser | null>(null);

  const [petition, setPetition] =
    useState<PetitionDetail | null>(null);

  const [staffList, setStaffList] =
    useState<AssignableStaff[]>([]);

  const [loading, setLoading] = useState(true);

  const [staffLoading, setStaffLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [formLoading, setFormLoading] = useState(false);

  const [formPriority, setFormPriority] =
    useState<PetitionPriority>("NORMAL");

  const [formStaffId, setFormStaffId] =
    useState<string>("");

  const [claimLoading, setClaimLoading] =
    useState(false);

  const [closeAction, setCloseAction] = useState<
    "CLOSED" | "REJECTED"
  >("CLOSED");

  const [closeReason, setCloseReason] = useState("");

  const [closeSaving, setCloseSaving] = useState(false);

  const [chatNotes, setChatNotes] = useState<
    PetitionNote[]
  >([]);

  const [chatInput, setChatInput] = useState("");

  const [chatSending, setChatSending] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [supportMessage, setSupportMessage] =
    useState("");

  const [supportSending, setSupportSending] =
    useState(false);

  const [supportRequests, setSupportRequests] =
    useState<SupportRequest[]>([]);

  const [respondContent, setRespondContent] = useState("");
  const [respondSending, setRespondSending] = useState(false);
  const [responses, setResponses] = useState<PetitionResponse[]>([]);

  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = useCallback(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollChatToBottom();
  }, [chatNotes, scrollChatToBottom]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const authResponse = await fetch(
          "/api/auth/me",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const authData =
          (await authResponse.json()) as MeResponse;

        if (
          !authResponse.ok ||
          !authData.success ||
          !authData.user
        ) {
          router.replace("/giris");
          return;
        }

        if (authData.user.role !== "UNIT_MANAGER") {
          router.replace("/dashboard/birim-muduru");
          return;
        }

        setCurrentUser(authData.user);

        const petitionResponse = await fetch(
          `/api/petitions/${petitionId}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const petitionData =
          (await petitionResponse.json()) as PetitionDetailResponse;

        if (
          !petitionResponse.ok ||
          !petitionData.success
        ) {
          throw new Error(
            petitionData.error ??
              "Başvuru bilgileri alınamadı."
          );
        }

        if (!petitionData.petition) {
          throw new Error("Başvuru bulunamadı.");
        }

        const loadedPetition =
          petitionData.petition;

        setPetition(loadedPetition);

        setFormPriority(loadedPetition.priority);

        if (loadedPetition.assignedStaff) {
          setFormStaffId(
            String(loadedPetition.assignedStaff.id)
          );
        } else {
          setFormStaffId("");
        }

        setChatNotes(loadedPetition.notes ?? []);
        setResponses(loadedPetition.responses ?? []);
        setSupportRequests(
          loadedPetition.supportRequests ?? []
        );

        if (authData.user.role === "UNIT_MANAGER") {
          setStaffLoading(true);

          const staffResponse = await fetch(
            `/api/staff?unitId=${loadedPetition.targetUnit.id}`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              signal: controller.signal,
            }
          );

          const staffData =
            (await staffResponse.json()) as StaffListResponse;

          if (
            !staffResponse.ok ||
            !staffData.success
          ) {
            throw new Error(
              staffData.error ??
                "Birim personelleri alınamadı."
            );
          }

          setStaffList(staffData.staff ?? []);
        }
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Sayfa yüklenirken hata oluştu."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setStaffLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      controller.abort();
    };
  }, [petitionId, router]);

  useEffect(() => {
    if (petition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormPriority(petition.priority);
      if (petition.assignedStaff) {
        setFormStaffId(
          String(petition.assignedStaff.id)
        );
      } else {
        setFormStaffId("");
      }
    }
  }, [petition]);

  async function handleUnifiedUpdate() {
    if (!petition) return;

    try {
      setFormLoading(true);
      setError("");
      setSuccessMessage("");

      const body: Record<string, unknown> = {};

      if (formPriority !== petition.priority) {
        body.priority = formPriority;
      }

      const currentAssignedId =
        petition.assignedStaff?.id ?? null;
      const newAssignedId = formStaffId
        ? Number(formStaffId)
        : null;

      if (
        currentUser?.role === "UNIT_MANAGER"
      ) {
        if (currentAssignedId !== newAssignedId) {
          body.assignedStaffId = newAssignedId;
        }
      }

      if (Object.keys(body).length === 0) {
        setFormLoading(false);
        return;
      }

      const response = await fetch(
        `/api/petitions/${petition.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data =
        (await response.json()) as UpdatePetitionResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Başvuru güncellenemedi."
        );
      }

      if (!data.petition) {
        throw new Error(
          "Güncellenen başvuru bilgisi alınamadı."
        );
      }

      setPetition((current) =>
        current
          ? {
              ...current,
              status: data.petition!.status,
              priority: data.petition!.priority,
              updatedAt: data.petition!.updatedAt,
              targetUnit: data.petition!.targetUnit,
              assignedStaff:
                data.petition!.assignedStaff,
            }
          : current
      );

      setFormPriority(data.petition.priority);
      setFormStaffId(
        data.petition.assignedStaff
          ? String(data.petition.assignedStaff.id)
          : ""
      );

      setSuccessMessage(
        data.message ??
          "Başvuru başarıyla güncellendi."
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Güncelleme sırasında sunucuya ulaşılamadı."
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleClaim() {
    if (!petition) return;

    try {
      setClaimLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/petitions/${petition.id}/claim`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data =
        (await response.json()) as ClaimResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Görev üstlenilemedi."
        );
      }

      if (!data.petition) {
        throw new Error(
          "Güncellenen başvuru bilgisi alınamadı."
        );
      }

      setPetition((current) =>
        current
          ? {
              ...current,
              status: data.petition!.status,
              priority: data.petition!.priority,
              updatedAt: data.petition!.updatedAt,
              targetUnit: data.petition!.targetUnit,
              assignedStaff:
                data.petition!.assignedStaff,
            }
          : current
      );

      setFormStaffId(
        data.petition.assignedStaff
          ? String(data.petition.assignedStaff.id)
          : ""
      );

      setSuccessMessage(
        data.message ??
          "Görev başarıyla üstlenildi."
      );
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : "Görev üstlenirken sunucuya ulaşılamadı."
      );
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleClose() {
    if (!petition) return;

    const trimmedReason = closeReason.trim();

    if (!trimmedReason) {
      setError(
        closeAction === "REJECTED"
          ? "Ret gerekçesi boş bırakılamaz."
          : "Kapatma açıklaması boş bırakılamaz."
      );
      return;
    }

    try {
      setCloseSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/petitions/${petition.id}/close`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: closeAction,
            reason: trimmedReason,
          }),
        }
      );

      const data =
        (await response.json()) as CloseResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "İşlem gerçekleştirilemedi."
        );
      }

      if (!data.petition) {
        throw new Error(
          "İşlem sonrası başvuru bilgisi alınamadı."
        );
      }

      setPetition((current) =>
        current
          ? {
              ...current,
              status: data.petition!.status,
              updatedAt: data.petition!.updatedAt,
            }
          : current
      );

      setCloseReason("");

      setSuccessMessage(
        data.message ?? "İşlem başarıyla tamamlandı."
      );
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : "İşlem sırasında sunucuya ulaşılamadı."
      );
    } finally {
      setCloseSaving(false);
    }
  }

  async function handleSendNote() {
    if (!petition) return;

    const trimmed = chatInput.trim();

    if (!trimmed) return;

    try {
      setChatSending(true);

      const response = await fetch(
        `/api/petitions/${petition.id}/notes`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: trimmed }),
        }
      );

      const data =
        (await response.json()) as NoteCreateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Not eklenemedi."
        );
      }

      if (data.note) {
        setChatNotes((prev) => [...prev, data.note!]);
      }

      setChatInput("");
    } catch (noteError) {
      setError(
        noteError instanceof Error
          ? noteError.message
          : "Not eklenirken hata oluştu."
      );
    } finally {
      setChatSending(false);
    }
  }

  async function handleSendSupport() {
    if (!petition) return;

    const trimmed = supportMessage.trim();

    if (!trimmed) return;

    try {
      setSupportSending(true);
      setError("");

      const response = await fetch(
        `/api/petitions/${petition.id}/support`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: trimmed }),
        }
      );

      const data =
        (await response.json()) as SupportCreateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Destek talebi oluşturulamadı."
        );
      }

      if (data.supportRequest) {
        setSupportRequests((prev) => [
          data.supportRequest!,
          ...prev,
        ]);
      }

      setSupportMessage("");
      setSuccessMessage(
        "Destek talebi başarıyla oluşturuldu."
      );
    } catch (supportError) {
      setError(
        supportError instanceof Error
          ? supportError.message
          : "Destek talebi gönderilirken hata oluştu."
      );
    } finally {
      setSupportSending(false);
    }
  }

  async function handleRefreshNotes() {
    if (!petition) return;

    try {
      const response = await fetch(
        `/api/petitions/${petition.id}/notes`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as NotesResponse;

      if (response.ok && data.success && data.notes) {
        setChatNotes(data.notes);
      }
    } catch {
      // silent refresh failure
    }
  }

  async function handleRespond() {
    if (!petition) return;

    const trimmed = respondContent.trim();
    if (!trimmed) {
      setError("Cevap içeriği boş bırakılamaz.");
      return;
    }

    try {
      setRespondSending(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/petitions/${petition.id}/respond`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: trimmed,
            visibility: "APPLICANT",
          }),
        }
      );

      const data = (await response.json()) as RespondCreateResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Cevap gönderilemedi.");
      }

      if (data.response) {
        setResponses((prev) => [...prev, data.response!]);
      }

      if (data.petitionStatus) {
        setPetition((current) =>
          current ? { ...current, status: data.petitionStatus! } : current
        );
      }

      setRespondContent("");
      setSuccessMessage("Cevap başarıyla gönderildi.");
    } catch (respondError) {
      setError(
        respondError instanceof Error
          ? respondError.message
          : "Cevap gönderilirken hata oluştu."
      );
    } finally {
      setRespondSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">
            Başvuru bilgileri yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (error && !petition) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>

        </div>
      </main>
    );
  }

  if (!petition || !currentUser) {
    return null;
  }

  const canEdit =
    currentUser.role === "UNIT_MANAGER";

  const canClose =
    currentUser.role === "UNIT_MANAGER";

  const canClaim =
    !petition.assignedStaff &&
    petition.status !== "CLOSED" &&
    petition.status !== "REJECTED" &&
    petition.status !== "EMAIL_PENDING" &&
    currentUser.unit !== null &&
    currentUser.unit.id ===
      petition.targetUnit.id;

  const isClosedOrRejected =
    petition.status === "CLOSED" ||
    petition.status === "REJECTED";

  const canRespond =
    !isClosedOrRejected &&
    petition.status !== "EMAIL_PENDING" &&
    currentUser.role === "UNIT_MANAGER" &&
    currentUser.unit !== null &&
    currentUser.unit.id === petition.targetUnit.id;

  const showChat = currentUser.unit !== null &&
    currentUser.unit.id === petition.targetUnit.id;

  const showSupport = currentUser.unit !== null &&
    currentUser.unit.id === petition.targetUnit.id;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <div className="mb-6">

          <p className="text-sm font-semibold text-blue-700">
            Başvuru Detayı
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            {petition.subject}
          </h1>

          <p className="mt-2 font-mono text-sm text-slate-500">
            {petition.trackingCode}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
            {successMessage}
          </div>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-8 lg:grid-cols-[1fr_360px]">
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
                {petition.assignedStaff && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Atanan Personel</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{petition.assignedStaff.firstName} {petition.assignedStaff.lastName}</p>
                  </div>
                )}
              </div>

              <div className="py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Başvuru Sahibi</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Ad Soyad</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{petition.applicantFirstName} {petition.applicantLastName}</p>
                  </div>
                  {petition.applicantEmail && (
                    <div>
                      <p className="text-xs text-slate-500">E-posta</p>
                      <p className="mt-0.5 text-sm text-slate-900">{petition.applicantEmail}</p>
                    </div>
                  )}
                  {petition.applicantPhone && (
                    <div>
                      <p className="text-xs text-slate-500">Telefon</p>
                      <p className="mt-0.5 text-sm text-slate-900">{petition.applicantPhone}</p>
                    </div>
                  )}
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

          {showChat && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-950">
                  Görev Notları (Chat)
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    void handleRefreshNotes()
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Yenile
                </button>
              </div>

              <div
                ref={chatContainerRef}
                className="mt-4 max-h-[500px] space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4"
                style={{ minHeight: "120px" }}
              >
                {chatNotes.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Henüz not eklenmemiş.
                  </p>
                )}

                {chatNotes.map((note) => {
                  const isSelf =
                    note.author.id === currentUser.id;

                  return (
                    <div
                      key={note.id}
                      className={`flex ${
                        isSelf
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isSelf
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-900 shadow-sm"
                        }`}
                      >
                        {!isSelf && (
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">
                              {note.author.firstName}{" "}
                              {note.author.lastName}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {
                                ROLE_LABELS[
                                  note.author.role
                                ]
                              }
                            </span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {note.content}
                        </p>

                        <p
                          className={`mt-1.5 text-[10px] ${
                            isSelf
                              ? "text-blue-200"
                              : "text-slate-400"
                          }`}
                        >
                          {formatShortDate(
                            note.createdAt
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div ref={chatEndRef} />
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) =>
                    setChatInput(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      void handleSendNote();
                    }
                  }}
                  placeholder="Notunuzu yazın..."
                  disabled={chatSending}
                  maxLength={5000}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => void handleSendNote()}
                  disabled={
                    chatSending || !chatInput.trim()
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chatSending ? "..." : "Gönder"}
                </button>
              </div>
            </section>
          )}

          {canRespond && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                Başvuruyu Yanıtla
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Başvuru sahibine cevap verebilirsiniz.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="respond-content" className="mb-2 block text-sm font-semibold text-slate-700">
                    Cevap İçeriği
                  </label>
                  <textarea
                    id="respond-content"
                    rows={5}
                    maxLength={10000}
                    value={respondContent}
                    onChange={(e) => setRespondContent(e.target.value)}
                    disabled={respondSending}
                    placeholder="Cevabınızı yazın..."
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleRespond()}
                  disabled={respondSending || !respondContent.trim()}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {respondSending ? "Gönderiliyor..." : "Cevabı Gönder"}
                </button>
              </div>
            </section>
          )}

          {/* Kapat / Reddet Butonları */}
          {petition.status !== "CLOSED" && petition.status !== "REJECTED" && petition.status !== "EMAIL_PENDING" && (
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => { setCloseAction("REJECTED"); setCloseModalOpen(true); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius)",
                  border: "1px solid #dc2626",
                  background: "white",
                  color: "#dc2626",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reddet
              </button>
              <button
                type="button"
                onClick={() => { setCloseAction("CLOSED"); setCloseModalOpen(true); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius)",
                  border: "1px solid #6b7280",
                  background: "white",
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Kapat
              </button>
            </div>
          )}

          {responses.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                Verilen Cevaplar
              </h2>

              <div className="mt-4 space-y-4">
                {responses.map((resp) => (
                  <div
                    key={resp.id}
                    className={`rounded-xl border p-4 ${
                      resp.visibility === "APPLICANT"
                        ? "border-blue-200 bg-blue-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                      <span>{resp.author.firstName} {resp.author.lastName}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {ROLE_LABELS[resp.author.role]}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                      {resp.content}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-400">
                      {formatShortDate(resp.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showSupport && (
            <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                Admin Destek Talebi
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Admin biriminden destek talebinde
                bulunabilirsiniz.
              </p>

              <div className="mt-4">
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={supportMessage}
                  onChange={(e) =>
                    setSupportMessage(e.target.value)
                  }
                  disabled={supportSending}
                  placeholder="Destek talebinizi açıklayın..."
                  className="w-full resize-y rounded-lg border border-amber-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleSendSupport()
                }
                disabled={
                  supportSending ||
                  !supportMessage.trim()
                }
                className="mt-3 w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {supportSending
                  ? "Gönderiliyor..."
                  : "Admin'den Destek İste"}
              </button>

              {supportRequests.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Destek Talepleri
                  </h3>

                  {supportRequests.map((sr) => (
                    <div
                      key={sr.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {sr.requestedBy.firstName}{" "}
                            {sr.requestedBy.lastName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatShortDate(
                              sr.createdAt
                            )}
                          </p>
                        </div>

                        <span
                          className={
                            SUPPORT_STATUS_STYLES[
                              sr.status
                            ]
                          }
                        >
                          {
                            SUPPORT_STATUS_LABELS[
                              sr.status
                            ]
                          }
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                        {sr.message}
                      </p>

                      {sr.supportUnit && (
                        <p className="mt-2 text-xs text-slate-500">
                          Destek Birimi:{" "}
                          <span className="font-medium text-slate-700">
                            {sr.supportUnit.name}
                          </span>
                        </p>
                      )}

                      {sr.resolvedBy && (
                        <p className="mt-1 text-xs text-slate-500">
                          Çözen:{" "}
                          <span className="font-medium text-slate-700">
                            {sr.resolvedBy.firstName}{" "}
                            {sr.resolvedBy.lastName}
                          </span>

                          {sr.resolvedAt && (
                            <span className="ml-1 text-slate-400">
                              (
                              {formatShortDate(
                                sr.resolvedAt
                              )}
                              )
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Güncel Durum
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Durum
                </p>

                <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  {STATUS_LABELS[petition.status]}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Öncelik
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {PRIORITY_LABELS[petition.priority]}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Atanan Personel
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {petition.assignedStaff
                    ? `${petition.assignedStaff.firstName} ${petition.assignedStaff.lastName}`
                    : "Henüz atanmadı"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  İşlem Yapan Kullanıcı
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {currentUser.firstName}{" "}
                  {currentUser.lastName}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {ROLE_LABELS[currentUser.role]}
                </p>
              </div>
            </div>
          </section>

          {canEdit && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Birleşik Yönetim Formu
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="form-priority"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Öncelik
                  </label>

                  <select
                    id="form-priority"
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(
                        e.target
                          .value as PetitionPriority
                      )
                    }
                    disabled={
                      formLoading || isClosedOrRejected
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {Object.entries(PRIORITY_LABELS).map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="form-staff"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Personel Atama
                  </label>

                  <select
                    id="form-staff"
                    value={formStaffId}
                    onChange={(e) =>
                      setFormStaffId(e.target.value)
                    }
                    disabled={
                      formLoading ||
                      staffLoading ||
                      isClosedOrRejected
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      Personel seçin
                    </option>

                    {staffList.map((staff) => (
                      <option
                        key={staff.id}
                        value={staff.id}
                      >
                        {staff.firstName}{" "}
                        {staff.lastName} —{" "}
                        {ROLE_LABELS[staff.role]}
                      </option>
                    ))}
                  </select>

                  {staffLoading && (
                    <p className="mt-2 text-xs text-slate-500">
                      Personeller yükleniyor...
                    </p>
                  )}

                  {!staffLoading &&
                    staffList.length === 0 && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        Bu birimde atanabilecek aktif
                        personel bulunamadı.
                      </p>
                    )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void handleUnifiedUpdate()
                  }
                  disabled={formLoading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? "Güncelleniyor..."
                    : "Güncelle"}
                </button>
              </div>
            </section>
          )}

          {canClaim && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="font-semibold text-emerald-950">
                Görevi Üstlen
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Bu başvuru henüz bir personele
                atanmamış. Görevi üstlenebilirsiniz.
              </p>

              <button
                type="button"
                onClick={() => void handleClaim()}
                disabled={claimLoading}
                className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {claimLoading
                  ? "Üstleniliyor..."
                  : "Bu Görevi Üstlen"}
              </button>
            </section>
          )}

          {canClose && !isClosedOrRejected && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-950">
                Kapatma / Reddetme
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Başvuruyu kapatmak veya reddetmek için
                aşağıdaki alanları kullanın.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="close-action"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  İşlem Türü
                </label>

                <select
                  id="close-action"
                  value={closeAction}
                  onChange={(e) =>
                    setCloseAction(
                      e.target.value as
                        | "CLOSED"
                        | "REJECTED"
                    )
                  }
                  disabled={closeSaving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                >
                  <option value="CLOSED">
                    Kapat
                  </option>
                  <option value="REJECTED">
                    Reddet
                  </option>
                </select>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="close-reason"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {closeAction === "REJECTED"
                    ? "Ret Gerekçesi"
                    : "Kapatma Açıklaması"}
                </label>

                <textarea
                  id="close-reason"
                  rows={3}
                  maxLength={2000}
                  value={closeReason}
                  onChange={(e) =>
                    setCloseReason(e.target.value)
                  }
                  disabled={closeSaving}
                  placeholder={
                    closeAction === "REJECTED"
                      ? "Ret gerekçenizi yazın..."
                      : "Kapatma açıklamanızı yazın..."
                  }
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleClose()}
                disabled={
                  closeSaving || !closeReason.trim()
                }
                className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {closeSaving
                  ? "İşleniyor..."
                  : closeAction === "REJECTED"
                    ? "Başvuruyu Reddet"
                    : "Başvuruyu Kapat"}
              </button>
            </section>
          )}

          {isClosedOrRejected && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="font-semibold text-slate-950">
                Son Durum
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bu başvuru{" "}
                <span className="font-semibold text-slate-800">
                  {STATUS_LABELS[petition.status]}
                </span>{" "}
                durumundadır. Üzerinde işlem
                yapılamaz.
              </p>
            </section>
          )}
        </aside>
      </div>

      {closeModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => { if (!closeSaving) { setCloseModalOpen(false); setCloseReason(""); } }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius)",
              padding: 24,
              width: "100%",
              maxWidth: 480,
              margin: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>
              {closeAction === "REJECTED" ? "Başvuruyu Reddet" : "Başvuruyu Kapat"}
            </h3>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              {closeAction === "REJECTED" ? "Ret Gerekçesi" : "Kapatma Açıklaması"}
            </label>
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder={closeAction === "REJECTED" ? "Ret gerekçesini yazın..." : "Kapatma açıklamasını yazın..."}
              rows={4}
              disabled={closeSaving}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setCloseModalOpen(false); setCloseReason(""); }}
                disabled={closeSaving}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "white",
                  fontSize: 14,
                  cursor: closeSaving ? "not-allowed" : "pointer",
                }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => void handleClose()}
                disabled={closeSaving || !closeReason.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius)",
                  border: "none",
                  background: closeAction === "REJECTED" ? "#dc2626" : "#6b7280",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: closeSaving || !closeReason.trim() ? "not-allowed" : "pointer",
                  opacity: closeSaving || !closeReason.trim() ? 0.5 : 1,
                }}
              >
                {closeSaving ? "İşleniyor..." : closeAction === "REJECTED" ? "Reddet" : "Kapat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
