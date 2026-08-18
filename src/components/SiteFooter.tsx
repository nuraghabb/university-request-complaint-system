"use client";

import Link from "next/link";

import { getDashboardPath, useSession } from "./useSession";

export default function SiteFooter() {
  const { user, checking } = useSession();

  const dashboardPath = user ? getDashboardPath(user.role) : null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <strong>Mersin Üniversitesi</strong>
          <span>Dilek &amp; Öneri Yönetim Sistemi</span>
        </div>

        <nav className="site-footer-links" aria-label="Alt menü">
          {!checking && (
            <>
              <Link
                href={
                  user
                    ? "/dashboard/basvuru-olustur"
                    : "/basvuru-misafir"
                }
              >
                Başvuru Oluştur
              </Link>

              <Link href="/basvuru-takip">Başvuru Takip</Link>

              {user && dashboardPath ? (
                <Link href={dashboardPath}>Panelim</Link>
              ) : (
                <Link href="/giris">Personel Girişi</Link>
              )}
            </>
          )}
        </nav>

        <p className="footer-copyright">
          © {new Date().getFullYear()} Mersin Üniversitesi
        </p>
      </div>
    </footer>
  );
}
