"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type StaffRole = "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";

interface LoginSuccessResponse {
  success: true;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: StaffRole;
    unit: {
      id: number;
      code: string;
      name: string;
    } | null;
  };
}

interface LoginErrorResponse {
  success: false;
  error: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("E-posta ve şifre alanlarını doldurun.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response.json()) as
        | LoginSuccessResponse
        | LoginErrorResponse;

      if (!response.ok || !data.success) {
        const errorMessage =
          "error" in data
            ? data.error
            : "Giriş yapılamadı.";

        setError(errorMessage);
        return;
      }

      redirectByRole(data.user.role, router);
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img
              src="/uni_logo.gif"
              alt="Mersin Üniversitesi"
              className="login-logo-img"
            />
          </div>

          <h1>Mersin Üniversitesi</h1>

          <p>Dilek ve Öneri Yönetim Sistemi</p>
        </div>

        <div className="login-body">
          <div
            style={{
              marginBottom: 22,
              padding: "12px 16px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Bu giriş ekranı yalnızca yetkili kurum personeli
            içindir.
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div
                className="alert alert-error"
                role="alert"
                style={{ marginBottom: 16 }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label
                className="form-label"
                htmlFor="email"
              >
                Kurumsal E-posta Adresi{" "}
                <span className="required">*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                placeholder="ornek@mersin.edu.tr"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label
                className="form-label"
                htmlFor="password"
              >
                Şifre{" "}
                <span className="required">*</span>
              </label>

              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <>
                  <span className="spinner" />{" "}
                  Giriş Yapılıyor...
                </>
              ) : (
                "🔐 Personel Girişi"
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                marginBottom: 10,
                color: "var(--text-muted)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Başvuru oluşturmak için personel hesabına
              ihtiyacınız yoktur.
            </p>

            <Link
              href="/basvuru-misafir"
              style={{
                color: "var(--primary)",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Başvuru sayfasına git →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function redirectByRole(
  role: StaffRole,
  router: ReturnType<typeof useRouter>
) {
  switch (role) {
    case "ADMIN":
      router.replace("/dashboard/admin");
      break;
    case "UNIT_MANAGER":
      router.replace("/dashboard/birim-muduru");
      break;
    case "UNIT_STAFF":
      router.replace("/dashboard/birim-personeli");
      break;
    default:
      router.replace("/giris");
  }
}