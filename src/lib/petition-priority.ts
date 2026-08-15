import type { PetitionPriority } from "@/types/petition";

interface PriorityResult {
  priority: PetitionPriority;
  dueAt: Date | null;
}

const SLA_HOURS: Partial<Record<string, number>> = {
  SIKAYET: 48,
  TALEP: 120,
  BILGI_EDINME: 72,
};

/**
 * Kategori ve hedef birime göre otomatik öncelik ve SLA hesaplar.
 */
export function calculatePetitionPriority(
  categoryCode: string,
  targetUnitCode: string
): PriorityResult {
  const normalizedCategory = categoryCode.toUpperCase();
  const normalizedUnit = targetUnitCode.toUpperCase();

  if (normalizedCategory === "SIKAYET") {
    const hours = SLA_HOURS.SIKAYET ?? 48;
    return {
      priority: "HIGH",
      dueAt: addHours(new Date(), hours),
    };
  }

  if (
    normalizedCategory === "TALEP" &&
    normalizedUnit === "OGRENCI_ISLERI"
  ) {
    const hours = SLA_HOURS.TALEP ?? 120;
    return {
      priority: "HIGH",
      dueAt: addHours(new Date(), hours),
    };
  }

  if (normalizedCategory === "BILGI_EDINME") {
    const hours = SLA_HOURS.BILGI_EDINME ?? 72;
    return {
      priority: "NORMAL",
      dueAt: addHours(new Date(), hours),
    };
  }

  return {
    priority: "NORMAL",
    dueAt: null,
  };
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}
