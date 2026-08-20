"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthenticatedPetitionForm from "@/components/AuthenticatedPetitionForm";
import type { AuthenticatedUserProfile } from "@/types/petition";

interface SuccessData {
  message: string;
  trackingCode: string;
}

export default function AuthenticatedPetitionPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/ogrenci-akademisyen-giris");
          return;
        }

        const data = await response.json();

        const ALLOWED_ROLES = [
          "STUDENT",
          "ACADEMIC",
          "ADMIN",
          "UNIT_MANAGER",
          "UNIT_STAFF",
        ];

        if (
          !data.user ||
          !ALLOWED_ROLES.includes(data.user.role)
        ) {
          router.replace("/ogrenci-akademisyen-giris");
          return;
        }

        setUser(data.user as AuthenticatedUserProfile);
      } catch {
        router.replace("/ogrenci-akademisyen-giris");
      } finally {
        setLoading(false);
      }
    }

    void loadSession();
  }, [router]);

  function handleSuccess(message: string, trackingCode: string) {
    setSuccessData({ message, trackingCode });
  }

  function getDashboardPath(role: string): string {
    if (role === "ACADEMIC") return "/dashboard/akademik";
    if (role === "STUDENT") return "/dashboard/ogrenci";
    return "/dashboard/personel";
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </main>
    );
  }

  if (!user) return null;

  const dashboardPath = getDashboardPath(user.role);

  if (successData) {
    return (
      <main className="main-content" style={{ maxWidth: 720 }}>
        <div>
          <div
            className="card"
            style={{ padding: 32, textAlign: "center" }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: "0 0 12px" }}>Başvurunuz Alındı</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
              {successData.message}
            </p>
            <div
              style={{
                background: "#f0f7ff",
                border: "1px solid #90cdf4",
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                Takip Kodunuz
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--primary, #0066cc)",
                }}
              >
                {successData.trackingCode}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push(dashboardPath)}
              >
                Panele Dön
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSuccessData(null)}
              >
                Yeni Başvuru
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content" style={{ maxWidth: 860 }}>
      <div>
        <AuthenticatedPetitionForm
          user={user}
          onSuccess={handleSuccess}
          onCancel={() => router.push(dashboardPath)}
        />
      </div>
    </main>
  );
}
