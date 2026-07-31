export type PetitionCategory =
  | "TALEP"
  | "SIKAYET"
  | "BILGI_EDINME"
  | "TESEKKUR"
  | "ONERI";

export type PetitionStatus =
  | "EMAIL_PENDING"
  | "RECEIVED"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "FORWARDED"
  | "ANSWERED"
  | "CLOSED"
  | "REJECTED";

export type PetitionPriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT";

export interface UnitOption {
  code: string;
  name: string;
}

/**
 * Yalnızca gerçek kişi doğrulama servisinde kullanılacak bilgiler.
 *
 * T.C. kimlik numarası ve doğum yılı başvuru tablosuna kaydedilmez.
 */
export interface IdentityVerificationInput {
  firstName: string;
  lastName: string;
  tcKimlik: string;
  birthYear: number;
}

export interface CreatePetitionFormData {
  firstName: string;
  lastName: string;
  tcKimlik: string;
  birthYear: string;
  email: string;
  phone: string;
  category: PetitionCategory | "";
  targetUnitCode: string;
  subject: string;
  content: string;
  privacyNoticeAcknowledged: boolean;
}

/**
 * Tarayıcıdan başvuru API'sine gönderilecek veri.
 *
 * captchaToken yalnızca sunucu tarafında doğrulanır;
 * veritabanına veya loglara yazılmaz.
 */
export interface CreatePetitionRequest {
  identity: IdentityVerificationInput;
  email: string;
  phone?: string;
  category: PetitionCategory;
  targetUnitCode: string;
  subject: string;
  content: string;
  captchaToken: string;
  privacyNoticeVersion: string;
  privacyNoticeAcknowledged: boolean;
}

export interface CreatePetitionSuccessResponse {
  success: true;
  message: string;
  verificationRequired: true;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  fieldErrors?: Partial<
    Record<keyof CreatePetitionFormData, string>
  >;
}

export interface PetitionTrackingSummary {
  trackingCode: string;
  category: PetitionCategory;
  status: PetitionStatus;
  priority: PetitionPriority;
  targetUnitName: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  applicantResponse?: string;
}