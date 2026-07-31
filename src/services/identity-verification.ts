import "server-only";

import { randomUUID } from "node:crypto";

import type { IdentityVerificationInput } from "@/types/petition";

export interface IdentityVerificationResult {
  verified: boolean;
  referenceId?: string;
  message?: string;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isValidIdentityInput(
  input: IdentityVerificationInput
): boolean {
  const currentYear = new Date().getFullYear();

  return (
    normalizeName(input.firstName).length >= 2 &&
    normalizeName(input.lastName).length >= 2 &&
    /^\d{11}$/.test(input.tcKimlik) &&
    Number.isInteger(input.birthYear) &&
    input.birthYear >= 1900 &&
    input.birthYear <= currentYear
  );
}

/**
 * Kimlik doğrulama servis katmanı.
 *
 * Geliştirme ortamında kontrollü mock kullanır.
 * Production ortamında gerçek servis yapılandırılmadan
 * doğrulama başarılı sayılmaz.
 *
 * T.C. kimlik numarası:
 * - Veritabanına kaydedilmez.
 * - Loglara yazılmaz.
 * - Fonksiyon sonucunda geri döndürülmez.
 */
export async function verifyIdentity(
  input: IdentityVerificationInput
): Promise<IdentityVerificationResult> {
  if (!isValidIdentityInput(input)) {
    return {
      verified: false,
      message: "Kimlik bilgileri geçerli formatta değil.",
    };
  }

  const provider =
    process.env.IDENTITY_VERIFICATION_PROVIDER ??
    (process.env.NODE_ENV === "production" ? "disabled" : "mock");

  if (provider === "mock") {
    return {
      verified: true,
      referenceId: `MOCK-${randomUUID()}`,
      message: "Kimlik bilgileri geliştirme ortamında doğrulandı.",
    };
  }

  return {
    verified: false,
    message: "Gerçek kimlik doğrulama servisi yapılandırılmamış.",
  };
}