'use client';

import { useState } from 'react';
import NewPetitionForm from '@/components/NewPetitionForm';

export default function GuestPage() {
  const [showForm, setShowForm] = useState(false);
  const [successCode, setSuccessCode] = useState('');

  function handleSuccess(petition: { trackingCode: string; konu: string }) {
    setShowForm(false);
    setSuccessCode(petition.trackingCode);
  }

  return (
    <div className="login-page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', color: '#fff', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🏛️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Mersin Üniversitesi</h1>
          <p style={{ opacity: .85, fontSize: 15 }}>Dilek & Öneri Sistemi — Misafir Başvuru</p>
        </div>

        <div className="card">
          <div className="card-body">
            {successCode ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Başvurunuz Alındı!</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Başvurunuz sisteme kaydedildi. Aşağıdaki takip kodunu saklayın.
                </p>
                <div style={{
                  background: 'var(--surface-2)',
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  marginBottom: 24,
                }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>TAKİP KODUNUZ</p>
                  <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: 2 }}>
                    {successCode}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button className="btn btn-outline" onClick={() => { setSuccessCode(''); setShowForm(false); }}>
                    Yeni Başvuru
                  </button>
                  <a href="/giris" className="btn btn-primary">
                    Giriş Yap
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14, lineHeight: 1.7 }}>
                  Mersin Üniversitesi'ne üye olmadan başvuru yapabilirsiniz.
                  Başvurunuzu takip etmek için geçerli bir e-posta adresi girmeniz yeterlidir.
                </p>
                <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
                  📝 Başvuru Oluştur
                </button>
                <div className="login-divider" style={{ margin: '24px 0' }}>
                  <span>veya</span>
                </div>
                <a href="/giris" className="btn btn-ghost btn-full">
                  🔐 Hesabımla Giriş Yap
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <NewPetitionForm
          guestMode
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
