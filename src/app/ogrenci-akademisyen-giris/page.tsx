"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InternalUserLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/internal-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || "Giriş başarısız");
                return;
            }

            // Giriş başarılı - role'e göre yönlendir
            const data = await response.json();
            const role = data.user.role;

            if (role === "ACADEMIC") {
                router.push("/dashboard/akademik");
            } else {
                router.push("/dashboard/ogrenci");
            }
        } catch (err) {
            console.error("Giriş hatası:", err);
            setError("Giriş işlemi sırasında hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <img
                        src="/uni_logo.gif"
                        alt="Mersin Üniversitesi"
                        style={{
                            width: 64,
                            height: 64,
                            objectFit: "contain",
                            display: "block",
                            margin: "0 auto 10px",
                        }}
                    />
                    <h1 style={styles.title}>Öğrenci / Akademisyen Girişi</h1>
                    <p style={styles.subtitle}>
                        Mersin Üniversitesi Dilekçe Yönetim Sistemi
                    </p>
                </div>

                <form onSubmit={handleLogin} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>
                            E-posta Adresi
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="E-posta adresinizi girin"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label htmlFor="password" style={styles.label}>
                            Şifre
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Şifrenizi girin"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            ...styles.button,
                            opacity: isLoading ? 0.6 : 1,
                            cursor: isLoading ? "not-allowed" : "pointer",
                        }}
                    >
                        {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>

                <div style={styles.divider}>veya</div>

                <div style={styles.info}>
                    <p style={styles.infoTitle}>Demo Hesapları:</p>
                    <ul style={styles.accountList}>
                        <li>
                            <strong>Öğrenci:</strong> ahmet.cetin@std.mersin.edu.tr / student123
                        </li>
                        <li>
                            <strong>Akademisyen:</strong> fatih.yilmaz@mersin.edu.tr / academic123
                        </li>
                    </ul>
                </div>

                <div style={styles.footer}>
                    <p>
                        Personel mi? <Link href="/giris" style={styles.link}>Personel girişine git</Link>
                    </p>
                    <p>
                        Dilekçe takip et? <Link href="/basvuru-takip" style={styles.link}>Buraya tıkla</Link>
                    </p>
                    <p>
                        <Link href="/" style={styles.link}>Ana sayfa</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        padding: "16px",
    },
    card: {
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        padding: "40px",
        maxWidth: "500px",
        width: "100%",
    },
    header: {
        textAlign: "center",
        marginBottom: "30px",
    },
    title: {
        fontSize: "28px",
        fontWeight: "bold",
        margin: "0 0 8px 0",
        color: "#1a1a1a",
    },
    subtitle: {
        fontSize: "14px",
        color: "#666",
        margin: 0,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "14px",
        fontWeight: "500",
        color: "#333",
    },
    input: {
        padding: "12px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontSize: "14px",
        fontFamily: "inherit",
        transition: "border-color 0.3s",
        boxSizing: "border-box",
    },
    button: {
        padding: "12px",
        backgroundColor: "#0066cc",
        color: "white",
        border: "none",
        borderRadius: "4px",
        fontSize: "16px",
        fontWeight: "500",
        cursor: "pointer",
        marginTop: "8px",
    },
    error: {
        padding: "12px",
        backgroundColor: "#fee",
        color: "#c00",
        borderRadius: "4px",
        fontSize: "14px",
    },
    divider: {
        textAlign: "center",
        margin: "24px 0",
        color: "#999",
        fontSize: "14px",
    },
    info: {
        backgroundColor: "#f9f9f9",
        padding: "16px",
        borderRadius: "4px",
        marginBottom: "24px",
    },
    infoTitle: {
        margin: "0 0 8px 0",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#333",
    },
    accountList: {
        margin: 0,
        paddingLeft: "16px",
        fontSize: "12px",
        color: "#666",
        lineHeight: "1.6",
    },
    footer: {
        borderTop: "1px solid #ddd",
        paddingTop: "16px",
        fontSize: "14px",
        color: "#666",
        textAlign: "center",
    },
    link: {
        color: "#0066cc",
        textDecoration: "none",
        fontWeight: "500",
    },
};
