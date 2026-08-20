"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  getDashboardPath,
  useSession,
  type SessionUser,
} from "./useSession";

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard/admin", label: "Admin Paneli" },
  { href: "/dashboard/admin/categories", label: "Kategoriler" },
  { href: "/dashboard/admin/units", label: "Birimler" },
  { href: "/dashboard/admin/personel", label: "Personel" },
];

const MANAGER_NAV_ITEMS = [
  { href: "/dashboard/birim-muduru", label: "Birim Paneli" },
  { href: "/dashboard/birim-muduru/personel", label: "Personel Yönetimi" },
];

const STAFF_NAV_ITEMS = [
  { href: "/dashboard/birim-personeli", label: "Birim Paneli" },
];

function getNavItems(user: SessionUser | null) {
  if (!user) {
    return [
      { href: "/", label: "Ana Sayfa" },
      { href: "/basvuru-misafir", label: "Başvuru Oluştur" },
      { href: "/basvuru-takip", label: "Başvuru Takip" },
    ];
  }

  if (user.role === "ADMIN") return [...ADMIN_NAV_ITEMS];
  if (user.role === "UNIT_MANAGER") return [...MANAGER_NAV_ITEMS];
  if (user.role === "UNIT_STAFF") return [...STAFF_NAV_ITEMS];

  return [];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const { user, checking } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function isNavActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const navItems = useMemo(() => getNavItems(user), [user]);

  const brandHref = user
    ? getDashboardPath(user.role)
    : "/";

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          href={brandHref}
          className="site-brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="site-logo" aria-hidden="true">
            <img
              src="/uni_logo.gif"
              alt=""
              className="site-logo-img"
            />
          </span>

          <span className="site-title-block">
            <span className="uni-name">Mersin Üniversitesi</span>
            <span className="sys-name">
              Dilek &amp; Öneri Yönetim Sistemi
            </span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Ana menü">
          {!checking &&
            navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isNavActive(item.href) ? "nav-link active" : "nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="site-actions">
          {checking ? null : user ? (
            <Link
              href="/dashboard/profil"
              className="profile-avatar-btn"
              title={`${user.firstName} ${user.lastName}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="profile-avatar">
                {getInitials(user.firstName, user.lastName)}
              </span>
            </Link>
          ) : (
            <>
              <Link href="/giris" className="btn btn-outline btn-sm">
                Personel Girişi
              </Link>

              <Link
                href="/ogrenci-akademisyen-giris"
                className="btn btn-primary btn-sm"
              >
                Öğrenci / Akademisyen
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Menüyü aç veya kapat"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="site-mobile-menu">
          <nav className="mobile-nav" aria-label="Mobil menü">
            {!checking &&
              navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isNavActive(item.href)
                      ? "nav-link active"
                      : "nav-link"
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="mobile-user-area">
            {user ? (
              <Link
                href="/dashboard/profil"
                className="btn btn-outline btn-sm btn-full"
                onClick={() => setMenuOpen(false)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <span className="profile-avatar profile-avatar-sm">
                  {getInitials(user.firstName, user.lastName)}
                </span>
                Profil
              </Link>
            ) : (
              <div className="mobile-actions">
                <Link
                  href="/giris"
                  className="btn btn-outline btn-sm btn-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Personel Girişi
                </Link>

                <Link
                  href="/ogrenci-akademisyen-giris"
                  className="btn btn-primary btn-sm btn-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Öğrenci / Akademisyen Girişi
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
