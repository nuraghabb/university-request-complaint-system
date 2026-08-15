import nodemailer from "nodemailer";
import { getPrismaClient } from "@/lib/prisma";
import { NotificationType, NotificationStatus } from "@prisma/client";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface NotificationPayload {
  petitionId: number;
  type: NotificationType;
  recipientEmail: string;
  subject: string;
  html: string;
}

/**
 * Email gönderimi için transporter konfigürasyonu
 * Test etmek için: https://ethereal.email (fake SMTP) veya
 * Gerçek SMTP sunucusu: Gmail, SendGrid, vb.
 */
function getEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST || "localhost";
  const smtpPort = parseInt(process.env.SMTP_PORT || "1025", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
}

/**
 * E-mail gönderir ve NotificationOutbox'a kaydeder
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = getEmailTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@mersin.edu.tr",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✉️ Email sent:", result.messageId);
  } catch (error) {
    console.error("📧 Email send error:", error);
    throw error;
  }
}

/**
 * Başvuruyla ilgili bildirim oluşturur ve kuyruğa ekler
 */
export async function queueNotification(
  payload: NotificationPayload
): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.notificationOutbox.create({
      data: {
        petitionId: payload.petitionId,
        type: payload.type,
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
        payload: {
          html: payload.html,
          subject: payload.subject,
        },
        status: NotificationStatus.PENDING,
      },
    });

    console.log(
      `📬 Notification queued for petition ${payload.petitionId} to ${payload.recipientEmail}`
    );
  } catch (error) {
    console.error("📬 Queue notification error:", error);
    throw error;
  }
}

/**
 * Email templateları
 */
export const emailTemplates = {
  verificationEmail: (verificationLink: string, name: string): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Mersin Üniversitesi - E-posta Doğrulaması</h2>
      <p>Merhaba ${name},</p>
      <p>Başvurunuzu tamamlamak için lütfen aşağıdaki bağlantıya tıklayın:</p>
      <p style="margin: 20px 0;">
        <a href="${verificationLink}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          E-postamı Doğrula
        </a>
      </p>
      <p style="color: #666; font-size: 12px;">
        Bu bağlantı 24 saat geçerlidir. Eğer bunu talep etmediyseniz bu e-postayı görmezden gelebilirsiniz.
      </p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        © 2026 Mersin Üniversitesi Dilekçe Yönetim Sistemi
      </p>
    </div>
  `,

  petitionReceived: (
    trackingCode: string,
    subject: string,
    name: string
  ): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Dilekçe Alındı</h2>
      <p>Merhaba ${name},</p>
      <p>Başvurunuz başarıyla alınmıştır.</p>
      <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Takip Kodu:</strong> <code>${trackingCode}</code></p>
        <p style="margin: 10px 0 0 0;"><strong>Başvuru:</strong> ${subject}</p>
      </div>
      <p>Başvurunuzu <a href="https://mersin.edu.tr/basvuru-takip?code=${trackingCode}">buradan takip edebilirsiniz</a>.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        © 2026 Mersin Üniversitesi Dilekçe Yönetim Sistemi
      </p>
    </div>
  `,

  petitionAssigned: (
    trackingCode: string,
    unitName: string,
    subject: string,
    name: string
  ): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Başvurunuz Atanmıştır</h2>
      <p>Merhaba ${name},</p>
      <p>Başvurunuz <strong>${unitName}</strong> birimine atanmıştır.</p>
      <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Takip Kodu:</strong> <code>${trackingCode}</code></p>
        <p style="margin: 10px 0 0 0;"><strong>Başvuru:</strong> ${subject}</p>
      </div>
      <p>Başvurunuzu <a href="https://mersin.edu.tr/basvuru-takip?code=${trackingCode}">buradan takip edebilirsiniz</a>.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        © 2026 Mersin Üniversitesi Dilekçe Yönetim Sistemi
      </p>
    </div>
  `,

  petitionAnswered: (
    trackingCode: string,
    subject: string,
    name: string
  ): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Başvurunuza Cevap Verildi</h2>
      <p>Merhaba ${name},</p>
      <p>Başvurunuza cevap verilmiştir.</p>
      <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Takip Kodu:</strong> <code>${trackingCode}</code></p>
        <p style="margin: 10px 0 0 0;"><strong>Başvuru:</strong> ${subject}</p>
      </div>
      <p>Cevabı <a href="https://mersin.edu.tr/basvuru-takip?code=${trackingCode}">buradan görebilirsiniz</a>.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        © 2026 Mersin Üniversitesi Dilekçe Yönetim Sistemi
      </p>
    </div>
  `,
};
