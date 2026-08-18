/**
 * Kategoriler artık veritabanından yönetilir.
 * Bu değer Category.code alanını temsil eder.
 */
export type PetitionCategory = string;

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

export interface CategoryOption {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface CategoriesSuccessResponse {
  success: true;
  categories: CategoryOption[];
}

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

  /**
   * Veritabanındaki Category.code değeri.
   */
  category: string;

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

  /**
   * Veritabanındaki Category.code değeri.
   */
  category: string;

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

export interface AuthenticatedCreatePetitionRequest {
  phone?: string;
  category: string;
  targetUnitCode: string;
  subject: string;
  content: string;
  privacyNoticeVersion: string;
  privacyNoticeAcknowledged: boolean;
}

export interface AuthenticatedCreatePetitionSuccessResponse {
  success: true;
  message: string;
  verificationRequired: false;
  trackingCode: string;
}

export interface AuthenticatedInternalUserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "ACADEMIC";
  studentNumber?: string | null;
  academicTitle?: string | null;
  department?: string | null;
}

export interface AuthenticatedStaffProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
  unit: { id: number; code: string; name: string } | null;
}

/**
 * Giriş yapmış ve otomatik başvuru formunu kullanabilen kullanıcı profili.
 * Öğrenci/akademisyen veya kurum personeli olabilir.
 */
export type AuthenticatedUserProfile =
  | AuthenticatedInternalUserProfile
  | AuthenticatedStaffProfile;

export interface AuthenticatedPetitionFormData {
  phone: string;
  category: string;
  targetUnitCode: string;
  subject: string;
  content: string;
  privacyNoticeAcknowledged: boolean;
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