'use client';

import { useRouter } from 'next/navigation';
import { USER_TYPE_LABELS } from '@/lib/constants';

interface NavbarProps {
  userName: string;
  userType: string;
}

const BADGE_CLASS: Record<string, string> = {
  ACADEMIC: 'badge-academic',
  STUDENT: 'badge-student',
  CITIZEN: 'badge-citizen',
};

export default function Navbar({ userName, userType }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/giris');
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="navbar-logo">🏛️</div>
          <div className="navbar-title">
            <span className="uni-name">Mersin Üniversitesi</span>
            <span className="sys-name">Dilek & Öneri Sistemi</span>
          </div>
        </div>

        <div className="navbar-user">
          <span className={`user-badge ${BADGE_CLASS[userType] || ''}`}>
            {USER_TYPE_LABELS[userType] || userType}
          </span>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{userName}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </div>
    </nav>
  );
}
