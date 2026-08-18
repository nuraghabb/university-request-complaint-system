import type { InternalUserRole, StaffRole } from "@prisma/client";

/**
 * Başvuru sahibinin rol etiketini döndürür.
 * Dökümandaki [İÇ/ÖĞRENCİ], [İÇ/AKADEMİK], [İÇ/PERSONEL], [DIŞ/VATANDAŞ]
 * formatına uygun.
 */
export function getApplicantRoleTag(
  role: InternalUserRole | StaffRole | "CITIZEN" | "STAFF"
): string {
  switch (role) {
    case "STUDENT":
      return "İÇ/ÖĞRENCİ";
    case "ACADEMIC":
      return "İÇ/AKADEMİK";
    case "ADMIN":
    case "UNIT_MANAGER":
    case "UNIT_STAFF":
    case "STAFF":
      return "İÇ/PERSONEL";
    default:
      return "DIŞ/VATANDAŞ";
  }
}
