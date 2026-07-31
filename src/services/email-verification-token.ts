import "server-only";

import { createHash, randomBytes } from "node:crypto";

export interface EmailVerificationTokenData {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

const DEFAULT_EXPIRATION_MINUTES = 30;
const MIN_EXPIRATION_MINUTES = 5;
const MAX_EXPIRATION_MINUTES = 24 * 60;

/**
 * Açık doğrulama tokenının SHA-256 özetini oluşturur.
 *
 * Açık token:
 * - Veritabanına kaydedilmez.
 * - Loglara yazılmaz.
 *
 * Veritabanında yalnızca hash değeri tutulur.
 */
export function hashEmailVerificationToken(token: string): string {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("E-posta doğrulama tokenı boş olamaz.");
  }

  return createHash("sha256")
    .update(normalizedToken, "utf8")
    .digest("hex");
}

/**
 * Güvenli bir e-posta doğrulama tokenı üretir.
 *
 * rawToken:
 * - Kullanıcıya gönderilecek doğrulama bağlantısında kullanılır.
 * - Veritabanına kaydedilmez.
 * - Loglara yazılmaz.
 *
 * tokenHash:
 * - EmailVerificationToken tablosuna kaydedilir.
 */
export function createEmailVerificationToken(
  expirationMinutes = DEFAULT_EXPIRATION_MINUTES
): EmailVerificationTokenData {
  if (
    !Number.isInteger(expirationMinutes) ||
    expirationMinutes < MIN_EXPIRATION_MINUTES ||
    expirationMinutes > MAX_EXPIRATION_MINUTES
  ) {
    throw new Error(
      "Token geçerlilik süresi 5 dakika ile 1440 dakika arasında olmalıdır."
    );
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashEmailVerificationToken(rawToken);

  const expiresAt = new Date(
    Date.now() + expirationMinutes * 60 * 1000
  );

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Tokenın süresinin dolup dolmadığını kontrol eder.
 */
export function isEmailVerificationTokenExpired(
  expiresAt: Date,
  now = new Date()
): boolean {
  if (
    Number.isNaN(expiresAt.getTime()) ||
    Number.isNaN(now.getTime())
  ) {
    throw new Error("Geçersiz tarih bilgisi.");
  }

  return expiresAt.getTime() <= now.getTime();
}