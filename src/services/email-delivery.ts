import "server-only";

import { randomUUID } from "node:crypto";

import { Resend } from "resend";

export type EmailProvider =
  | "resend"
  | "log"
  | "disabled";

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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email.trim()
  );
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
 * Tek bir e-posta bildiriminin gönderimini gerçekleştirir.
 *
 * Güvenlik:
 * - API anahtarı istemciye gönderilmez.
 * - E-posta gövdesi loglanmaz.
 * - Doğrulama tokenı loglanmaz.
 */
export async function deliverEmail(
  message: EmailMessage
): Promise<EmailDeliveryResult> {
  const recipientEmail =
    message.to.trim().toLowerCase();

  const subject = message.subject.trim();
  const text = message.text.trim();

  if (!isValidEmail(recipientEmail)) {
    return {
      success: false,
      provider: "disabled",
      error:
        "Geçerli bir alıcı e-posta adresi bulunamadı.",
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
    (process.env.NODE_ENV === "production"
      ? "disabled"
      : "log");

  /**
   * Gerçek Resend gönderimi.
   */
  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey) {
      console.error(
        "RESEND_API_KEY tanımlı değil."
      );

      return {
        success: false,
        provider: "resend",
        error:
          "E-posta gönderim servisi yapılandırılmamış.",
      };
    }

    if (!from) {
      console.error(
        "EMAIL_FROM tanımlı değil."
      );

      return {
        success: false,
        provider: "resend",
        error:
          "Gönderici e-posta adresi yapılandırılmamış.",
      };
    }

    try {
      const resend = new Resend(apiKey);

      const { data, error } =
        await resend.emails.send({
          from,
          to: recipientEmail,
          subject,
          text,
          ...(message.html
            ? { html: message.html }
            : {}),
        });

      if (error) {
        console.error(
          "Resend e-posta gönderim hatası:",
          {
            name: error.name,
            message: error.message,
          }
        );

        return {
          success: false,
          provider: "resend",
          error:
            "E-posta gönderilemedi.",
        };
      }

      console.info(
        "E-posta Resend ile gönderildi.",
        {
          providerMessageId:
            data?.id ?? undefined,
          recipient:
            maskEmail(recipientEmail),
          subject,
        }
      );

      return {
        success: true,
        provider: "resend",
        providerMessageId:
          data?.id ?? undefined,
      };
    } catch (error) {
      console.error(
        "Resend servisine ulaşılamadı:",
        error instanceof Error
          ? error.message
          : "Bilinmeyen hata"
      );

      return {
        success: false,
        provider: "resend",
        error:
          "E-posta servisine ulaşılamadı.",
      };
    }
  }

  /**
   * Yerel geliştirme için gerçek gönderim yapmadan
   * güvenli log üretir.
   */
  if (provider === "log") {
    const providerMessageId =
      `LOG-${randomUUID()}`;

    console.info(
      "E-posta geliştirme ortamında loglandı.",
      {
        providerMessageId,
        recipient:
          maskEmail(recipientEmail),
        subject,
      }
    );

    return {
      success: true,
      provider: "log",
      providerMessageId,
    };
  }

  return {
    success: false,
    provider: "disabled",
    error:
      "E-posta gönderim servisi yapılandırılmamış.",
  };
}