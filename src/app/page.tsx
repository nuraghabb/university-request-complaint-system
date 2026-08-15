"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import LandingPage from "./_landing";

interface SessionResponse {
  success?: boolean;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF" | "STUDENT" | "ACADEMIC";
  } | null;
}

function getDashboardPath(
  role: SessionResponse["user"] extends infer U ? U extends { role: infer R } ? R : never : never
): string {
  if (role === "STUDENT") return "/dashboard/ogrenci";
  if (role === "ACADEMIC") return "/dashboard/akademik";
  return "/dashboard/personel";
}

export default function HomePage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function redirectUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as SessionResponse;

        if (!isMounted) {
          return;
        }

        if (response.ok && data.user) {
          router.replace(getDashboardPath(data.user.role));
          return;
        }
      } catch {
        // oturum kontrolü başarısızsa landing sayfası gösterilir
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    void redirectUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--primary)",
        }}
      >
        <div style={{ color: "#fff", textAlign: "center" }}>
          <div
            className="spinner"
            style={{
              width: 40,
              height: 40,
              borderWidth: 3,
              margin: "0 auto 16px",
            }}
          />
          <p>Yönlendiriliyor...</p>
        </div>
      </main>
    );
  }

  return <LandingPage />;
}