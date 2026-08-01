"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerificationStatus =
  | "loading"
  | "success"
  | "already-verified"
  | "error";

interface VerifyEmailSuccessResponse {
  success: true;
  alreadyVerified: boolean;
  message: string;
  petition: {
    trackingCode: string;
    status: string;
  };
}

interface VerifyEmailErrorResponse {
  success: false;
  error: string;
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<VerificationLoadingPage />}>
      <EmailVerificationContent />
    </Suspense>
  );
}

function EmailVerificationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] =
    useState<VerificationStatus>("loading");

  const [message, setMessage] = useState(
    "E-posta adresiniz doğrulanıyor..."
  );

  const [trackingCode, setTrackingCode] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    async function verifyEmail() {
      if (!token) {
        if (isMounted) {
          setStatus("error");
          setMessage(
            "Doğrulama bağlantısı eksik veya geçersiz."
          );
        }

        return;
      }

      try {
        const response = await fetch(
          "/api/petitions/verify-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
            }),
          }
        );

        const data = (await response.json()) as
          | VerifyEmailSuccessResponse
          | VerifyEmailErrorResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.success) {
          const errorMessage =
            "error" in data
              ? data.error
              : "E-posta doğrulaması tamamlanamadı.";

          setStatus("error");
          setMessage(errorMessage);
          return;
        }

        setTrackingCode(data.petition.trackingCode);
        setMessage(data.message);

        setStatus(
          data.alreadyVerified
            ? "already-verified"
            : "success"
        );
      } catch {
        if (isMounted) {
          setStatus("error");
          setMessage(
            "Doğrulama sırasında sunucuya ulaşılamadı. Lütfen tekrar deneyin."
          );
        }
      }
    }

    verifyEmail();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <main
      className="login-page"
      style={{ padding: 24 }}
    >
      <section
        className="login-card"
        style={{
          width: "100%",
          maxWidth: 560,
        }}
      >
        <div className="login-header">
          <div className="login-logo">
            {status === "loading" && "⏳"}
            {status === "success" && "✅"}
            {status === "already-verified" && "ℹ️"}
            {status === "error" && "⚠️"}
          </div>

          <h1>E-posta Doğrulaması</h1>

          <p>
            Mersin Üniversitesi Dilek ve Öneri Yönetim
            Sistemi
          </p>
        </div>

        <div
          className="login-body"
          style={{ textAlign: "center" }}
        >
          {status === "loading" ? (
            <div style={{ padding: "20px 0" }}>
              <div
                className="spinner spinner-dark"
                style={{
                  width: 42,
                  height: 42,
                  borderWidth: 3,
                  margin: "0 auto 18px",
                }}
              />

              <p
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                {message}
              </p>
            </div>
          ) : (
            <>
              <div
                className={
                  status === "error"
                    ? "alert alert-error"
                    : "alert alert-success"
                }
                role="alert"
                style={{
                  marginBottom: 20,
                  textAlign: "left",
                  lineHeight: 1.7,
                }}
              >
                {status === "error" ? "⚠️" : "✅"}{" "}
                {message}
              </div>

              {trackingCode && (
                <div
                  style={{
                    padding: 18,
                    marginBottom: 22,
                    border:
                      "1px solid var(--border)",
                    borderRadius:
                      "var(--radius-lg)",
                    background:
                      "var(--surface-2)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "var(--text-muted)",
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Başvuru Takip Kodunuz
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontFamily: "monospace",
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {trackingCode}
                  </p>
                </div>
              )}

              {status === "success" && (
                <p
                  style={{
                    marginBottom: 22,
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Takip kodunuzu güvenli bir yerde
                  saklayın. Başvurunuz artık ilgili
                  birimin personel panelinde
                  görüntülenebilir.
                </p>
              )}

              {status === "already-verified" && (
                <p
                  style={{
                    marginBottom: 22,
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Bu başvuru için e-posta doğrulaması
                  daha önce tamamlanmış. Takip kodunuzla
                  başvuru durumunu görüntüleyebilirsiniz.
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <Link
                  href="/basvuru-misafir"
                  className="btn btn-primary"
                >
                  Başvuru Sayfasına Dön
                </Link>

                {status === "error" && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      window.location.reload()
                    }
                  >
                    Tekrar Dene
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function VerificationLoadingPage() {
  return (
    <main
      className="login-page"
      style={{ padding: 24 }}
    >
      <section
        className="login-card"
        style={{
          width: "100%",
          maxWidth: 560,
        }}
      >
        <div
          className="login-body"
          style={{
            textAlign: "center",
            padding: 40,
          }}
        >
          <div
            className="spinner spinner-dark"
            style={{
              width: 42,
              height: 42,
              borderWidth: 3,
              margin: "0 auto 18px",
            }}
          />

          <p
            style={{
              color: "var(--text-secondary)",
            }}
          >
            Doğrulama sayfası yükleniyor...
          </p>
        </div>
      </section>
    </main>
  );
}