"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import Navbar from "@/components/Navbar";
import { PetitionList } from "@/components/PetitionList";
import NewPetitionForm from "@/components/NewPetitionForm";

interface UserInfo {
  userId: number;
  ad: string;
  soyad: string;
  email: string;
  userType: string;
}

interface Petition {
  id: number;
  trackingCode: string;
  category: string;
  targetUnit: string;
  konu: string;
  icerik: string;
  status: string;
  adminNotu?: string | null;
  cevapTarihi?: string | null;
  createdAt: string;
}

export default function AkademikDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPetitions = useCallback(async () => {
    const response = await fetch("/api/petitions");

    if (response.ok) {
      const data = await response.json();
      setPetitions(data.petitions);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (
          !data.user ||
          data.user.userType !== "ACADEMIC"
        ) {
          router.replace("/giris");
          return;
        }

        setUser(data.user);
        return fetchPetitions();
      })
      .catch(() => {
        router.replace("/giris");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, fetchPetitions]);

  function handleSuccess(message: string) {
    setShowForm(false);
    setSuccessMsg(message);

    setTimeout(() => {
      setSuccessMsg("");
    }, 8000);
  }

  if (loading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  const stats = {
    total: petitions.length,
    beklemede: petitions.filter(
      (petition) => petition.status === "BEKLEMEDE"
    ).length,
    incelemede: petitions.filter(
      (petition) => petition.status === "INCELEMEDE"
    ).length,
    cevaplandi: petitions.filter(
      (petition) => petition.status === "CEVAPLANDI"
    ).length,
  };

  return (
    <div className="page-wrapper">
      <Navbar
        userName={`${user.ad} ${user.soyad}`}
        userType={user.userType}
      />

      <div className="page-hero">
        <div className="page-hero-inner">
          <h1>🎓 Akademik Personel Portalı</h1>

          <p>
            Hoş geldiniz, {user.ad} {user.soyad}.
            Başvurularınızı buradan takip edebilirsiniz.
          </p>
        </div>
      </div>

      <div className="main-content">
        {successMsg && (
          <div
            className="alert alert-success"
            style={{ marginBottom: 20 }}
          >
            ✅ {successMsg}
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">
              {stats.total}
            </div>
            <div className="stat-label">
              Toplam Başvuru
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">
              {stats.beklemede}
            </div>
            <div className="stat-label">
              Beklemede
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔍</div>
            <div className="stat-value">
              {stats.incelemede}
            </div>
            <div className="stat-label">
              İncelemede
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">
              {stats.cevaplandi}
            </div>
            <div className="stat-label">
              Cevaplandı
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2 className="section-title">
            📄 Başvurularım
          </h2>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Yeni Başvuru
          </button>
        </div>

        <PetitionList petitions={petitions} />
      </div>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek
        &amp; Öneri Sistemi ©{" "}
        {new Date().getFullYear()}
      </footer>

      {showForm && (
        <NewPetitionForm
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function LoadingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="spinner spinner-dark"
          style={{
            width: 40,
            height: 40,
            borderWidth: 3,
            margin: "0 auto 16px",
          }}
        />

        <p style={{ color: "var(--text-muted)" }}>
          Yükleniyor...
        </p>
      </div>
    </div>
  );
}