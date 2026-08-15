import type { InternalUserRole } from "@prisma/client";

/**
 * Başvuru sahibinin rol etiketini döndürür.
 * Dökümandaki [İÇ/ÖĞRENCİ], [İÇ/AKADEMİK], [DIŞ/VATANDAŞ] formatına uygun.
 */
export function getApplicantRoleTag(
  role: InternalUserRole | "CITIZEN"
): string {
  switch (role) {
    case "STUDENT":
      return "İÇ/ÖĞRENCİ";
    case "ACADEMIC":
      return "İÇ/AKADEMİK";
    default:
      return "DIŞ/VATANDAŞ";
  }
}
