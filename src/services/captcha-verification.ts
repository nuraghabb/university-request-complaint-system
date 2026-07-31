import "server-only";

export interface CaptchaVerificationInput {
  token: string;
  remoteIp?: string;
  expectedAction?: string;
}

export interface CaptchaVerificationResult {
  success: boolean;
  message?: string;
}

interface TurnstileApiResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
}

/**
 * Başvuru sırasında alınan CAPTCHA tokenını sunucu tarafında doğrular.
 *
 * Güvenlik kuralları:
 * - CAPTCHA tokenı veritabanına kaydedilmez.
 * - CAPTCHA tokenı loglara yazılmaz.
 * - Geliştirme ortamında kontrollü mock kullanılabilir.
 * - Production ortamında gerçek Turnstile doğrulaması zorunludur.
 */
export async function verifyCaptcha(
  input: CaptchaVerificationInput
): Promise<CaptchaVerificationResult> {
  const token = input.token?.trim();

  if (!token) {
    return {
      success: false,
      message: "Güvenlik doğrulaması eksik.",
    };
  }

  const provider =
    process.env.CAPTCHA_PROVIDER ??
    (process.env.NODE_ENV === "production" ? "disabled" : "mock");

  /**
   * Yalnızca geliştirme ortamında kullanılacak kontrollü test doğrulaması.
   */
  if (provider === "mock") {
    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        message: "Production ortamında mock CAPTCHA kullanılamaz.",
      };
    }

    if (token !== "development-mock-token") {
      return {
        success: false,
        message: "Geliştirme güvenlik doğrulaması başarısız.",
      };
    }

    return {
      success: true,
      message: "Geliştirme güvenlik doğrulaması başarılı.",
    };
  }

  if (provider !== "turnstile") {
    return {
      success: false,
      message: "Güvenlik doğrulama servisi yapılandırılmamış.",
    };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY tanımlı değil.");

    return {
      success: false,
      message: "Güvenlik doğrulama servisi kullanılamıyor.",
    };
  }

  try {
    const formData = new URLSearchParams();

    formData.set("secret", secretKey);
    formData.set("response", token);

    if (input.remoteIp) {
      formData.set("remoteip", input.remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("Turnstile HTTP hatası:", response.status);

      return {
        success: false,
        message: "Güvenlik doğrulaması tamamlanamadı.",
      };
    }

    const result = (await response.json()) as TurnstileApiResponse;

    if (!result.success) {
      console.error("Turnstile doğrulaması başarısız.", {
        errorCodes: result["error-codes"] ?? [],
      });

      return {
        success: false,
        message: "Güvenlik doğrulaması başarısız.",
      };
    }

    if (
      input.expectedAction &&
      result.action !== input.expectedAction
    ) {
      console.error("Turnstile action uyuşmazlığı.");

      return {
        success: false,
        message: "Güvenlik doğrulaması geçersiz.",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "CAPTCHA doğrulama servisine ulaşılamadı.",
      error instanceof Error ? error.message : "Bilinmeyen hata"
    );

    return {
      success: false,
      message: "Güvenlik doğrulaması sırasında hata oluştu.",
    };
  }
}