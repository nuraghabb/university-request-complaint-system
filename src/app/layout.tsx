import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mersin Üniversitesi - Dilek & Öneri Sistemi',
  description: 'Mersin Üniversitesi Dilek, Şikayet, Öneri ve Bilgi Edinme Başvuru Sistemi',
  keywords: 'Mersin Üniversitesi, dilek, öneri, şikayet, bilgi edinme, başvuru',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
