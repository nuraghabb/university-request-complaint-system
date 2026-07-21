'use client';

import { useState } from 'react';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  TARGET_UNIT_LABELS,
} from '@/lib/constants';

const CATEGORIES = Object.entries(CATEGORY_LABELS);
const TARGET_UNITS = Object.entries(TARGET_UNIT_LABELS);

interface NewPetitionFormProps {
  onSuccess: (petition: { trackingCode: string; konu: string }) => void;
  onCancel: () => void;
  // Guest mode: no logged-in user
  guestMode?: boolean;
}

export default function NewPetitionForm({ onSuccess, onCancel, guestMode = false }: NewPetitionFormProps) {
  const [form, setForm] = useState({
    category: '',
    targetUnit: '',
    konu: '',
    icerik: '',
    // Guest fields
    adSoyad: '',
    email: '',
    telefon: '',
    tcKimlik: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.category || !form.targetUnit || !form.konu.trim() || !form.icerik.trim()) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    if (guestMode && !form.email.trim()) {
      setError('Misafir başvurularda e-posta zorunludur.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Başvuru gönderilemedi.');
      } else {
        onSuccess({ trackingCode: data.petition.trackingCode, konu: data.petition.konu });
      }
    } catch {
      setError('Sunucu hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2 className="modal-title">📝 Yeni Başvuru</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Guest mode fields */}
            {guestMode && (
              <>
                <div style={{ background: 'var(--info-bg)', border: '1px solid #90cdf4', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--info)' }}>
                  ℹ️ Misafir olarak başvuru yapıyorsunuz. Yanıtları takip etmek için geçerli bir e-posta adresi girin.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Ad Soyad <span className="required">*</span></label>
                    <input name="adSoyad" className="form-control" placeholder="Ad Soyad" value={form.adSoyad} onChange={handleChange} required={guestMode} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TC Kimlik No</label>
                    <input name="tcKimlik" className="form-control" placeholder="11 haneli TC No" value={form.tcKimlik} onChange={handleChange} maxLength={11} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-posta <span className="required">*</span></label>
                    <input name="email" type="email" className="form-control" placeholder="ornek@email.com" value={form.email} onChange={handleChange} required={guestMode} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefon</label>
                    <input name="telefon" className="form-control" placeholder="05XX XXX XX XX" value={form.telefon} onChange={handleChange} />
                  </div>
                </div>
                <div className="divider" />
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="category">
                  Kategori <span className="required">*</span>
                </label>
                <select id="category" name="category" className="form-control" value={form.category} onChange={handleChange} required>
                  <option value="">Seçiniz...</option>
                  {CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {CATEGORY_ICONS[value]} {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="targetUnit">
                  Hedef Birim <span className="required">*</span>
                </label>
                <select id="targetUnit" name="targetUnit" className="form-control" value={form.targetUnit} onChange={handleChange} required>
                  <option value="">Seçiniz...</option>
                  {TARGET_UNITS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="konu">
                Konu <span className="required">*</span>
              </label>
              <input
                id="konu"
                name="konu"
                className="form-control"
                placeholder="Başvurunuzun konusunu kısaca belirtin"
                value={form.konu}
                onChange={handleChange}
                maxLength={500}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="icerik">
                İçerik <span className="required">*</span>
              </label>
              <textarea
                id="icerik"
                name="icerik"
                className="form-control"
                placeholder="Başvurunuzun detaylarını açıklayın..."
                value={form.icerik}
                onChange={handleChange}
                rows={6}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                İptal
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner" /> Gönderiliyor...</> : '📤 Başvuruyu Gönder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
