'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) redirectByType(data.user.userType, router);
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş yapılamadı.');
      } else {
        redirectByType(data.user.userType, router);
      }
    } catch {
      setError('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏛️</div>
          <h1>Mersin Üniversitesi</h1>
          <p>Dilek & Öneri Yönetim Sistemi</p>
        </div>

        <div className="login-body">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                E-posta Adresi <span className="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="ornek@mersin.edu.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Şifre <span className="required">*</span>
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? <><span className="spinner" /> Giriş Yapılıyor...</> : '🔐 Giriş Yap'}
            </button>
          </form>

          <div className="login-divider"><span>TEST HESAPLARI</span></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TestAccountButton
              label="🎓 Akademik Personel"
              email="ahmet.yilmaz@mersin.edu.tr"
              pass="akademik123"
              onFill={(e, p) => { setEmail(e); setPassword(p); }}
            />
            <TestAccountButton
              label="📚 Öğrenci"
              email="mehmet.demir@std.mersin.edu.tr"
              pass="ogrenci123"
              onFill={(e, p) => { setEmail(e); setPassword(p); }}
            />
            <TestAccountButton
              label="👤 Vatandaş"
              email="fatma.ozturk@gmail.com"
              pass="vatandas123"
              onFill={(e, p) => { setEmail(e); setPassword(p); }}
            />
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Hesabınız yoksa{' '}
            <a href="/basvuru-misafir" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              misafir olarak başvuru yapabilirsiniz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function TestAccountButton({
  label, email, pass, onFill,
}: {
  label: string;
  email: string;
  pass: string;
  onFill: (e: string, p: string) => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ justifyContent: 'flex-start', fontSize: 12 }}
      onClick={() => onFill(email, pass)}
    >
      {label} — <span style={{ opacity: .6, marginLeft: 4 }}>{email}</span>
    </button>
  );
}

function redirectByType(userType: string, router: ReturnType<typeof useRouter>) {
  if (userType === 'ACADEMIC') router.replace('/dashboard/akademik');
  else if (userType === 'STUDENT') router.replace('/dashboard/ogrenci');
  else router.replace('/dashboard/vatandas');
}
