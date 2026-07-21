'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { PetitionList } from '@/components/PetitionList';
import NewPetitionForm from '@/components/NewPetitionForm';

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

export default function OgrenciDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPetitions = useCallback(async () => {
    const res = await fetch('/api/petitions');
    if (res.ok) {
      const data = await res.json();
      setPetitions(data.petitions);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.userType !== 'STUDENT') {
          router.replace('/giris');
          return;
        }
        setUser(data.user);
        return fetchPetitions();
      })
      .catch(() => router.replace('/giris'))
      .finally(() => setLoading(false));
  }, [router, fetchPetitions]);

  function handleSuccess(petition: { trackingCode: string; konu: string }) {
    setShowForm(false);
    setSuccessMsg(`Başvurunuz alındı! Takip kodunuz: ${petition.trackingCode}`);
    fetchPetitions();
    setTimeout(() => setSuccessMsg(''), 8000);
  }

  if (loading) return <LoadingPage />;
  if (!user) return null;

  const stats = {
    total: petitions.length,
    beklemede: petitions.filter((p) => p.status === 'BEKLEMEDE').length,
    incelemede: petitions.filter((p) => p.status === 'INCELEMEDE').length,
    cevaplandi: petitions.filter((p) => p.status === 'CEVAPLANDI').length,
  };

  return (
    <div className="page-wrapper">
      <Navbar userName={`${user.ad} ${user.soyad}`} userType={user.userType} />

      <div className="page-hero" style={{ background: 'linear-gradient(135deg, #0a5c37 0%, #1a8f5a 100%)' }}>
        <div className="page-hero-inner">
          <h1>📚 Öğrenci Portalı</h1>
          <p>Hoş geldiniz, {user.ad} {user.soyad}. Dilek ve önerilerinizi buradan iletebilirsiniz.</p>
        </div>
      </div>

      <div className="main-content">
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: 20 }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value" style={{ color: '#0a5c37' }}>{stats.total}</div>
            <div className="stat-label">Toplam Başvuru</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value" style={{ color: '#0a5c37' }}>{stats.beklemede}</div>
            <div className="stat-label">Beklemede</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔍</div>
            <div className="stat-value" style={{ color: '#0a5c37' }}>{stats.incelemede}</div>
            <div className="stat-label">İncelemede</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value" style={{ color: '#0a5c37' }}>{stats.cevaplandi}</div>
            <div className="stat-label">Cevaplandı</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">⚡ Hızlı Başvuru</span>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              {[
                { icon: '📋', label: 'Talep', cat: 'TALEP' },
                { icon: '⚠️', label: 'Şikayet', cat: 'SIKAYET' },
                { icon: 'ℹ️', label: 'Bilgi Edinme', cat: 'BILGI_EDINME' },
                { icon: '💡', label: 'Öneri', cat: 'ONERI' },
                { icon: '🙏', label: 'Teşekkür', cat: 'TESEKKUR' },
              ].map((item) => (
                <button
                  key={item.cat}
                  className="quick-action-btn"
                  onClick={() => setShowForm(true)}
                >
                  <span className="qa-icon">{item.icon}</span>
                  <span className="qa-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="section-title">📄 Başvurularım</h2>
          <button className="btn btn-primary" style={{ background: '#0a5c37' }} onClick={() => setShowForm(true)}>
            + Yeni Başvuru
          </button>
        </div>

        <PetitionList petitions={petitions} />
      </div>

      <footer className="footer">
        <strong>Mersin Üniversitesi</strong> — Dilek & Öneri Sistemi © {new Date().getFullYear()}
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner-dark" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Yükleniyor...</p>
      </div>
    </div>
  );
}
