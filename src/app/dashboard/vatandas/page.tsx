"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VatandasDashboardCompatPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/basvuru-misafir");
    }, [router]);

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--primary)",
                color: "#fff",
            }}
        >
            <div style={{ textAlign: "center" }}>
                <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
                <p>Yönlendiriliyor...</p>
            </div>
        </main>
    );
}
