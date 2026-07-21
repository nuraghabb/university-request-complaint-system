'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { PetitionList } from '@/components/PetitionList';
import NewPetitionForm from '@/components/NewPetitionForm';
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_ICONS, TARGET_UNIT_LABELS } from '@/lib/constants';

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

export default function VatandasDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [successCode, setSuccessCode] = useState('');
  const [loading, setLoading] = useState(true);

  // Takip sorgulama
  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState<Petition | null>(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

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
        if (!data.user || data.user.userType !== 'CITIZEN') {
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
    setSuccessCode(petition.trackingCode);
    fetchPetitions();
  }

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackCode.trim()) return;
    setTrackError('');
    setTrackResult(null);
    setTrackLoading(true);
    try {
      const res = await fetch(`/api/petitions/track/${trackCode.trim()}`);
      const data = await res.json();
      if (!res.ok) setTrackError(data.error || 'Başvuru bulunamadı.');
      else setTrackResult(data.petition);
    } catch {
      setTrackError('Sunucu hatası.');
    } finally {
      setTrackLoading(false);
    }
  }

  if (loading) return <LoadingPage />;
  if (!user) return null;

  return (
    <div className="page-wrapper">
      <Navbar userName={`${user.ad} ${user.soyad}`} userType={user.userType} />

      <div className="page-hero" style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)' }}>
        <div className="page-hero-inner">
          <h1>👤 Vatandaş Başvuru Portalı</h1>
          <p>Mersin Üniversitesi'ne dilek, öneri ve şikayetlerinizi iletebilirsiniz.</p>
        </div>
      </div>

      <div className="main-content">
        {successCode && (
          <div className="alert alert-success" style={{ marginBottom: 20, padding: '16px 20px' }}>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>✅ Başvurunuz başarıyla alındı!</p>
              <p>Takip kodunuz: <strong style={{ fontFamily: 'monospace', fontSize: 16 }}>{successCode}</strong></p>
              <p style={{ fontSize: 12, marginTop: 4, opacity: .8 }}>Bu kodu saklayın. Başvurunuzu takip etmek için kullanabilirsiniz.</p>
            </div>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setSuccessCode('')}>×</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          {/* New Petition CTA */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📝 Yeni Başvuru</span>
            </div>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Üniversitemize talep, şikayet, öneri veya teşekkürünüzü iletmek için başvuru oluşturun.
              </p>
              <button className="btn btn-primary btn-lg btn-full" onClick={() => setShowForm(true)}>
                + Başvuru Oluştur
              </button>
            </div>
          </div>

          {/* Track Petition */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🔍 Başvuru Sorgula</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleTrack}>
                <div className="form-group">
                  <label className="form-label">Takip Kodu</label>
                  <input
                    className="form-control"
                    placeholder="Örn: MER20240001"
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <button type="submit" className="btn btn-outline btn-full" disabled={trackLoading}>
                  {trackLoading ? <><span className="spinner spinner-dark" /> Sorgulanıyor...</> : '🔍 Sorgula'}
                </button>
              </form>

              {trackError && (
                <div className="alert alert-error" style={{ marginTop: 12 }}>
                  ⚠️ {trackError}
                </div>
              )}

              {trackResult && (
                <div style={{ marginTop: 14, padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{trackResult.trackingCode}</span>
                    <span className={`status-badge ${STATUS_COLORS[trackResult.status]}`}>
                      {STATUS_LABELS[trackResult.status]}
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{trackResult.konu}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {CATEGORY_ICONS[trackResult.category]} {CATEGORY_LABELS[trackResult.category]} •{' '}
                    {TARGET_UNIT_LABELS[trackResult.targetUnit]}
                  </p>
                  {trackResult.adminNotu && (
                    <div style={{ marginTop: 10, padding: '10px', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)', fontSize: 13 }}>
                      <strong style={{ color: 'var(--success)' }}>Kurum Yanıtı:</strong>
                      <p style={{ marginTop: 4 }}>{trackResult.adminNotu}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="section-title">📄 Başvurularım</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
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
