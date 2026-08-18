"use client";

import { useEffect, useState } from "react";
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

type NormalPetitionStatus = "RECEIVED" | "IN_REVIEW";

type PetitionPriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT";

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

interface PriorityUpdateResponse {
  success: boolean;
  message?: string;

  petition?: {
    id: number;
    trackingCode: string;
    priority: PetitionPriority;
    status: PetitionStatus;
    updatedAt: string;
  };

  error?: string;
}

interface StatusUpdateResponse {
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

interface AssignPetitionResponse {
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
      email?: string;
      role?: StaffRole;
    } | null;
  };

  error?: string;
}

const STATUS_LABELS: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "E-posta Bekleniyor",
  RECEIVED: "Başvuru Alındı",
  ASSIGNED: "Personele Atandı",
  IN_REVIEW: "İnceleniyor",
  FORWARDED: "Başka Birime Yönlendirildi",
  ANSWERED: "Cevaplandı",
  CLOSED: "Kapatıldı",
  REJECTED: "Reddedildi",
};

const NORMAL_STATUS_LABELS: Record<
  NormalPetitionStatus,
  string
> = {
  RECEIVED: "Başvuru Alındı",
  IN_REVIEW: "İnceleniyor",
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function getInitialNormalStatus(
  status: PetitionStatus
): NormalPetitionStatus {
  if (
    status === "RECEIVED" ||
    status === "IN_REVIEW"
  ) {
    return status;
  }

  return "IN_REVIEW";
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

  /*
   * ÖNCELİK
   */

  const [selectedPriority, setSelectedPriority] =
    useState<PetitionPriority>("NORMAL");

  const [priorityNote, setPriorityNote] =
    useState("");

  const [prioritySaving, setPrioritySaving] =
    useState(false);

  /*
   * DURUM
   */

  const [selectedStatus, setSelectedStatus] =
    useState<NormalPetitionStatus>("IN_REVIEW");

  const [statusNote, setStatusNote] =
    useState("");

  const [statusSaving, setStatusSaving] =
    useState(false);

  /*
   * PERSONEL ATAMA
   */

  const [selectedStaffId, setSelectedStaffId] =
    useState("");

  const [assignmentNote, setAssignmentNote] =
    useState("");

  const [assignmentSaving, setAssignmentSaving] =
    useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        /*
         * 1. Giriş yapan personeli öğren
         */

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

        setCurrentUser(authData.user);

        /*
         * 2. Başvuru detayını getir
         */

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
          throw new Error(
            "Başvuru bulunamadı."
          );
        }

        const loadedPetition =
          petitionData.petition;

        setPetition(loadedPetition);

        setSelectedPriority(
          loadedPetition.priority
        );

        setSelectedStatus(
          getInitialNormalStatus(
            loadedPetition.status
          )
        );

        if (loadedPetition.assignedStaff) {
          setSelectedStaffId(
            String(
              loadedPetition.assignedStaff.id
            )
          );
        }

        /*
         * 3. Admin veya birim yöneticisiyse
         * hedef birimin personellerini getir.
         */

        if (
          authData.user.role === "ADMIN" ||
          authData.user.role === "UNIT_MANAGER"
        ) {
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

          setStaffList(
            staffData.staff ?? []
          );
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

  /*
   * ÖNCELİK GÜNCELLE
   */

  async function handlePriorityUpdate() {
    if (!petition) {
      return;
    }

    try {
      setPrioritySaving(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/petitions/${petition.id}/priority`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priority: selectedPriority,
            note:
              priorityNote.trim() ||
              undefined,
          }),
        }
      );

      const data =
        (await response.json()) as PriorityUpdateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Başvuru önceliği güncellenemedi."
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
              priority:
                data.petition!.priority,
              updatedAt:
                data.petition!.updatedAt,
            }
          : current
      );

      setSelectedPriority(
        data.petition.priority
      );

      setPriorityNote("");

      setSuccessMessage(
        data.message ??
          "Başvuru önceliği başarıyla güncellendi."
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Öncelik güncellenirken sunucuya ulaşılamadı."
      );
    } finally {
      setPrioritySaving(false);
    }
  }

  /*
   * DURUM GÜNCELLE
   */

  async function handleStatusUpdate() {
    if (!petition) {
      return;
    }

    try {
      setStatusSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/petitions/${petition.id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: selectedStatus,
            note:
              statusNote.trim() ||
              undefined,
          }),
        }
      );

      const data =
        (await response.json()) as StatusUpdateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Başvuru durumu güncellenemedi."
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
              status:
                data.petition!.status,
              priority:
                data.petition!.priority,
              updatedAt:
                data.petition!.updatedAt,
              targetUnit:
                data.petition!.targetUnit,
              assignedStaff:
                data.petition!.assignedStaff,
            }
          : current
      );

      if (
        data.petition.status === "RECEIVED" ||
        data.petition.status === "IN_REVIEW"
      ) {
        setSelectedStatus(
          data.petition.status
        );
      }

      setStatusNote("");

      setSuccessMessage(
        data.message ??
          "Başvuru durumu başarıyla güncellendi."
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Durum güncellenirken sunucuya ulaşılamadı."
      );
    } finally {
      setStatusSaving(false);
    }
  }

  /*
   * PERSONELE ATA
   */

  async function handleAssignment() {
    if (!petition) {
      return;
    }

    const staffId =
      Number(selectedStaffId);

    if (
      !Number.isSafeInteger(staffId) ||
      staffId <= 0
    ) {
      setError(
        "Lütfen atanacak personeli seçin."
      );
      return;
    }

    try {
      setAssignmentSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/petitions/${petition.id}/assign`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedStaffId: staffId,
            note:
              assignmentNote.trim() ||
              undefined,
          }),
        }
      );

      const data =
        (await response.json()) as AssignPetitionResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Başvuru personele atanamadı."
        );
      }

      if (!data.petition) {
        throw new Error(
          "Atama sonrası başvuru bilgileri alınamadı."
        );
      }

      setPetition((current) =>
        current
          ? {
              ...current,
              status:
                data.petition!.status,
              priority:
                data.petition!.priority,
              updatedAt:
                data.petition!.updatedAt,
              targetUnit:
                data.petition!.targetUnit,
              assignedStaff:
                data.petition!.assignedStaff,
            }
          : current
      );

      if (data.petition.assignedStaff) {
        setSelectedStaffId(
          String(
            data.petition.assignedStaff.id
          )
        );
      }

      setAssignmentNote("");

      setSuccessMessage(
        data.message ??
          "Başvuru personele başarıyla atandı."
      );
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Personel atama işlemi sırasında sunucuya ulaşılamadı."
      );
    } finally {
      setAssignmentSaving(false);
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
            ❌ {error}
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/personel"
              )
            }
            className="mt-6 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Personel Paneline Dön
          </button>
        </div>
      </main>
    );
  }

  if (!petition || !currentUser) {
    return null;
  }

  const statusCannotBeChanged =
    petition.status === "CLOSED" ||
    petition.status === "REJECTED" ||
    petition.status === "EMAIL_PENDING";

  const assignmentCannotBeChanged =
    petition.status === "CLOSED" ||
    petition.status === "REJECTED" ||
    petition.status === "EMAIL_PENDING";

  const canAssign =
    currentUser.role === "ADMIN" ||
    currentUser.role === "UNIT_MANAGER";

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/personel"
              )
            }
            className="mb-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Personel Paneline Dön
          </button>

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
            ❌ {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
            ✅ {successMessage}
          </div>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Başvuru İçeriği
            </h2>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {petition.content}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Başvuru Sahibi
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ad Soyad
                </p>

                <p className="mt-2 font-medium text-slate-950">
                  {petition.applicantFirstName}{" "}
                  {petition.applicantLastName}
                </p>
              </div>

              {petition.applicantEmail && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    E-posta
                  </p>

                  <p className="mt-2 font-medium text-slate-950">
                    {petition.applicantEmail}
                  </p>
                </div>
              )}

              {petition.applicantPhone && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Telefon
                  </p>

                  <p className="mt-2 font-medium text-slate-950">
                    {petition.applicantPhone}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Başvuru Bilgileri
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kategori
                </p>

                <p className="mt-2 font-medium text-slate-950">
                  {petition.category.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hedef Birim
                </p>

                <p className="mt-2 font-medium text-slate-950">
                  {petition.targetUnit.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Oluşturulma
                </p>

                <p className="mt-2 text-sm font-medium text-slate-800">
                  {formatDate(
                    petition.createdAt
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Son Güncelleme
                </p>

                <p className="mt-2 text-sm font-medium text-slate-800">
                  {formatDate(
                    petition.updatedAt
                  )}
                </p>
              </div>
            </div>
          </section>
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
                  {
                    PRIORITY_LABELS[
                      petition.priority
                    ]
                  }
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

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="font-semibold text-blue-950">
              Öncelik Yönetimi
            </h2>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              Başvurunun işlem önceliğini
              değiştirebilirsiniz.
            </p>

            <div className="mt-5">
              <label
                htmlFor="priority"
                className="mb-2 block text-sm font-semibold text-blue-950"
              >
                Öncelik
              </label>

              <select
                id="priority"
                value={selectedPriority}
                onChange={(event) =>
                  setSelectedPriority(
                    event.target.value as PetitionPriority
                  )
                }
                disabled={prioritySaving}
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {Object.entries(
                  PRIORITY_LABELS
                ).map(
                  ([priority, label]) => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mt-4">
              <label
                htmlFor="priority-note"
                className="mb-2 block text-sm font-semibold text-blue-950"
              >
                İşlem Notu
              </label>

              <textarea
                id="priority-note"
                rows={3}
                maxLength={2000}
                value={priorityNote}
                onChange={(event) =>
                  setPriorityNote(
                    event.target.value
                  )
                }
                disabled={prioritySaving}
                placeholder="İsteğe bağlı açıklama..."
                className="w-full resize-y rounded-lg border border-blue-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void handlePriorityUpdate()
              }
              disabled={
                prioritySaving ||
                selectedPriority ===
                  petition.priority
              }
              className="mt-4 w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prioritySaving
                ? "Güncelleniyor..."
                : "Önceliği Güncelle"}
            </button>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-950">
              Durum Yönetimi
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Başvuruyu normal işlem
              akışında güncelleyebilirsiniz.
            </p>

            <div className="mt-5">
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-amber-950"
              >
                Yeni Durum
              </label>

              <select
                id="status"
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target
                      .value as NormalPetitionStatus
                  )
                }
                disabled={
                  statusSaving ||
                  statusCannotBeChanged
                }
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {Object.entries(
                  NORMAL_STATUS_LABELS
                ).map(([status, label]) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label
                htmlFor="status-note"
                className="mb-2 block text-sm font-semibold text-amber-950"
              >
                Durum Notu
              </label>

              <textarea
                id="status-note"
                rows={3}
                maxLength={2000}
                value={statusNote}
                onChange={(event) =>
                  setStatusNote(
                    event.target.value
                  )
                }
                disabled={
                  statusSaving ||
                  statusCannotBeChanged
                }
                placeholder="İsteğe bağlı durum açıklaması..."
                className="w-full resize-y rounded-lg border border-amber-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {statusCannotBeChanged && (
              <p className="mt-3 text-xs font-medium text-red-700">
                Bu başvurunun mevcut
                durumunda normal durum
                değişikliği yapılamaz.
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                void handleStatusUpdate()
              }
              disabled={
                statusSaving ||
                statusCannotBeChanged ||
                selectedStatus ===
                  petition.status
              }
              className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {statusSaving
                ? "Güncelleniyor..."
                : "Durumu Güncelle"}
            </button>
          </section>

          {canAssign && (
            <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
              <h2 className="font-semibold text-violet-950">
                Personel Atama
              </h2>

              <p className="mt-2 text-sm leading-6 text-violet-800">
                Başvuruyu hedef birimdeki
                aktif bir personele
                atayabilirsiniz.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="assigned-staff"
                  className="mb-2 block text-sm font-semibold text-violet-950"
                >
                  Atanacak Personel
                </label>

                <select
                  id="assigned-staff"
                  value={selectedStaffId}
                  onChange={(event) =>
                    setSelectedStaffId(
                      event.target.value
                    )
                  }
                  disabled={
                    staffLoading ||
                    assignmentSaving ||
                    assignmentCannotBeChanged
                  }
                  className="w-full rounded-lg border border-violet-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                  <p className="mt-2 text-xs text-violet-700">
                    Personeller yükleniyor...
                  </p>
                )}

                {!staffLoading &&
                  staffList.length === 0 && (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      Bu birimde atanabilecek
                      aktif personel bulunamadı.
                    </p>
                  )}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="assignment-note"
                  className="mb-2 block text-sm font-semibold text-violet-950"
                >
                  Atama Notu
                </label>

                <textarea
                  id="assignment-note"
                  rows={3}
                  maxLength={2000}
                  value={assignmentNote}
                  onChange={(event) =>
                    setAssignmentNote(
                      event.target.value
                    )
                  }
                  disabled={
                    assignmentSaving ||
                    assignmentCannotBeChanged
                  }
                  placeholder="İsteğe bağlı atama açıklaması..."
                  className="w-full resize-y rounded-lg border border-violet-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {assignmentCannotBeChanged && (
                <p className="mt-3 text-xs font-medium text-red-700">
                  Bu başvurunun mevcut
                  durumunda personel ataması
                  yapılamaz.
                </p>
              )}

              <button
                type="button"
                onClick={() =>
                  void handleAssignment()
                }
                disabled={
                  assignmentSaving ||
                  assignmentCannotBeChanged ||
                  staffLoading ||
                  !selectedStaffId
                }
                className="mt-4 w-full rounded-lg bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignmentSaving
                  ? "Atanıyor..."
                  : "Personele Ata"}
              </button>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Sıradaki İşlemler
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sonraki adımlarda başka
              birime yönlendirme, başvuru
              sahibine cevap verme ve
              kapatma/reddetme işlemlerini
              ekleyeceğiz.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}