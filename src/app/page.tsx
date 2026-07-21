'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check auth status and redirect
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const type = data.user.userType;
          if (type === 'ACADEMIC') router.replace('/dashboard/akademik');
          else if (type === 'STUDENT') router.replace('/dashboard/ogrenci');
          else router.replace('/dashboard/vatandas');
        } else {
          router.replace('/giris');
        }
      })
      .catch(() => router.replace('/giris'));
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)' }}>
      <div style={{ color: '#fff', textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
        <p>Yönlendiriliyor...</p>
      </div>
    </div>
  );
}
