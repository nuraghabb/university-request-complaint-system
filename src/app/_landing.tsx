"use client";

import Link from "next/link";

export default function LandingPage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #123b7a 0%, #1a5bb8 100%)",
                padding: 24,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 720,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 20,
                    padding: 32,
                    color: "#fff",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ fontSize: 56, marginBottom: 12 }}>🏛️</div>
                    <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
                        Mersin Üniversitesi
                    </h1>
                    <p style={{ margin: "10px 0 0", opacity: 0.9, fontSize: 18 }}>
                        Dilek, Öneri ve Başvuru Yönetim Sistemi
                    </p>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                    }}
                >
                    <Link
                        href="/giris"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 96,
                            textDecoration: "none",
                            borderRadius: 16,
                            background: "#fff",
                            color: "#123b7a",
                            fontWeight: 700,
                            fontSize: 18,
                        }}
                    >
                        🔐 Personel Girişi
                    </Link>

                    <Link
                        href="/ogrenci-akademisyen-giris"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 96,
                            textDecoration: "none",
                            borderRadius: 16,
                            background: "#fff",
                            color: "#123b7a",
                            fontWeight: 700,
                            fontSize: 18,
                        }}
                    >
                        👨‍🎓 Öğrenci/Akademisyen
                    </Link>

                    <Link
                        href="/basvuru-misafir"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 96,
                            textDecoration: "none",
                            borderRadius: 16,
                            background: "rgba(255,255,255,0.12)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 18,
                            border: "1px solid rgba(255,255,255,0.2)",
                        }}
                    >
                        📝 Başvuru Oluştur
                    </Link>

                    <Link
                        href="/basvuru-takip"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 96,
                            textDecoration: "none",
                            borderRadius: 16,
                            background: "rgba(255,255,255,0.08)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 18,
                            border: "1px solid rgba(255,255,255,0.2)",
                        }}
                    >
                        📍 Başvuru Takibi
                    </Link>
                </div>
            </div>
        </main>
    );
}
