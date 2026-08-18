import type { Metadata } from "next";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Mersin Üniversitesi - Dilek & Öneri Sistemi",
  description:
    "Mersin Üniversitesi Dilek, Şikayet, Öneri ve Bilgi Edinme Başvuru Sistemi",
  keywords:
    "Mersin Üniversitesi, dilek, öneri, şikayet, bilgi edinme, başvuru",
  icons: {
    icon: "/uni_logo.gif",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <div className="app-shell">
          <SiteHeader />
          <div className="app-main">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
