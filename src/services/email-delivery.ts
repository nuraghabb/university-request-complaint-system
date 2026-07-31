import "server-only";

import { randomUUID } from "node:crypto";

export type EmailProvider = "log" | "disabled";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  provider: EmailProvider;
  providerMessageId?: string;
  error?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return "***";
  }

  const visiblePart = localPart.slice(0, 2);

  return `${visiblePart}***@${domain}`;
}

/**
 * Tek bir e-posta bildiriminin gönderim işlemini gerçekleştirir.
 *
 * Bu fonksiyon:
 * - Kuyruğun kendisi değildir.
 * - PostgreSQL kurulduğunda NotificationOutbox kayıtlarını işler.
 * - Geliştirme ortamında gerçek gönderim yerine güvenli log üretir.
 * - E-posta gövdesini veya doğrulama tokenını loglamaz.
 */
export async function deliverEmail(
  message: EmailMessage
): Promise<EmailDeliveryResult> {
  const recipientEmail = message.to.trim().toLowerCase();
  const subject = message.subject.trim();
  const text = message.text.trim();

  if (!isValidEmail(recipientEmail)) {
    return {
      success: false,
      provider: "disabled",
      error: "Geçerli bir alıcı e-posta adresi bulunamadı.",
    };
  }

  if (!subject) {
    return {
      success: false,
      provider: "disabled",
      error: "E-posta konusu boş olamaz.",
    };
  }

  if (!text) {
    return {
      success: false,
      provider: "disabled",
      error: "E-posta içeriği boş olamaz.",
    };
  }

  const provider =
    process.env.EMAIL_PROVIDER ??
    (process.env.NODE_ENV === "production" ? "disabled" : "log");

  if (provider === "log") {
    const providerMessageId = `LOG-${randomUUID()}`;

    console.info("E-posta geliştirme ortamında loglandı.", {
      providerMessageId,
      recipient: maskEmail(recipientEmail),
      subject,
    });

    return {
      success: true,
      provider: "log",
      providerMessageId,
    };
  }

  return {
    success: false,
    provider: "disabled",
    error: "E-posta gönderim servisi yapılandırılmamış.",
  };
}