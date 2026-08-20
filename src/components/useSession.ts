"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export interface SessionUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  unit?: { id: number; code: string; name: string } | null;
}

interface MeResponse {
  success: boolean;
  user: SessionUser | null;
  error?: string;
}

export function getDashboardPath(role: string): string {
  switch (role) {
    case "STUDENT":
      return "/dashboard/ogrenci";
    case "ACADEMIC":
      return "/dashboard/akademik";
    case "ADMIN":
      return "/dashboard/admin";
    case "UNIT_MANAGER":
      return "/dashboard/birim-muduru";
    case "UNIT_STAFF":
      return "/dashboard/birim-personeli";
    default:
      return "/basvuru-misafir";
  }
}

export function useSession() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const attemptRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      attemptRef.current += 1;
      const attempt = attemptRef.current;

      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted || attempt !== attemptRef.current) return;

        if (response.ok) {
          const data = (await response.json()) as MeResponse;
          setUser(data.user ?? null);
        } else if (response.status === 401) {
          // Kesin oturum yokluğu: misafir durumuna geç
          setUser(null);
        }
        // Diğer hatalarda (5xx) önceki oturum bilgisi korunur
      } catch {
        // Geçici ağ hatası: önceki oturum bilgisi korunur
      } finally {
        if (mounted && attempt === attemptRef.current) {
          setChecking(false);
        }
      }
    }

    void loadSession();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  return { user, checking };
}
