"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionResponse {
  success?: boolean;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
  } | null;
}

export default function HomePage() {
  const router = useRouter();

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
          router.replace("/dashboard/personel");
          return;
        }

        router.replace("/basvuru-misafir");
      } catch {
        if (isMounted) {
          router.replace("/basvuru-misafir");
        }
      }
    }

    redirectUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

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
      <div
        style={{
          color: "#fff",
          textAlign: "center",
        }}
      >
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