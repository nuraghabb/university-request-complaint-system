"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  getDashboardPath,
  useSession,
  type SessionUser,
} from "./useSession";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Sistem Yöneticisi",
  UNIT_MANAGER: "Birim Yöneticisi",
  UNIT_STAFF: "Birim Personeli",
  STUDENT: "Öğrenci",
  ACADEMIC: "Akademisyen",
};

const ROLE_BADGES: Record<string, string> = {
  ADMIN: "badge-admin",
  UNIT_MANAGER: "badge-manager",
  UNIT_STAFF: "badge-staff",
  STUDENT: "badge-student",
  ACADEMIC: "badge-academic",
};

const NAV_ITEMS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/basvuru-misafir", label: "Başvuru Oluştur" },
  { href: "/basvuru-takip", label: "Başvuru Takip" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard/admin/categories", label: "Kategori Yönetimi" },
  { href: "/dashboard/admin/units", label: "Birim Yönetimi" },
];

function getNavItems(user: SessionUser | null) {
  const isLoggedIn = Boolean(user);

  const items = NAV_ITEMS.map((item) => {
    if (item.href === "/") {
      return {
        ...item,
        href: isLoggedIn && user ? getDashboardPath(user.role) : "/",
      };
    }
    if (item.href === "/basvuru-misafir") {
      return {
        ...item,
        href: isLoggedIn
          ? "/dashboard/basvuru-olustur"
          : "/basvuru-misafir",
      };
    }
    return item;
  });

  if (user?.role === "ADMIN") {
    items.push(...ADMIN_NAV_ITEMS);
  }

  return items;
}

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function getRoleBadge(role: string): string {
  return ROLE_BADGES[role] ?? "";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const { user, checking } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    }
  }

  function isNavActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  }

  const navItems = useMemo(() => getNavItems(user), [user]);

  const dashboardPath = user ? getDashboardPath(user.role) : null;
  const brandHref = user ? dashboardPath ?? "/" : "/";

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
            <>
              <span className="user-chip">
                <span
                  className={`user-badge ${getRoleBadge(user.role)}`}
                >
                  {getRoleLabel(user.role)}
                </span>

                <span className="user-name">
                  {user.firstName} {user.lastName}
                </span>
              </span>

              {dashboardPath && (
                <Link
                  href={dashboardPath}
                  className="btn btn-outline btn-sm"
                >
                  Panel
                </Link>
              )}

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void handleLogout()}
              >
                Çıkış
              </button>
            </>
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
              <>
                <div className="mobile-user-info">
                  <span
                    className={`user-badge ${getRoleBadge(user.role)}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>

                  <span className="user-name">
                    {user.firstName} {user.lastName}
                  </span>
                </div>

                <div className="mobile-actions">
                  {dashboardPath && (
                    <Link
                      href={dashboardPath}
                      className="btn btn-outline btn-sm btn-full"
                      onClick={() => setMenuOpen(false)}
                    >
                      Panel
                    </Link>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-full"
                    onClick={() => void handleLogout()}
                  >
                    Çıkış Yap
                  </button>
                </div>
              </>
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
