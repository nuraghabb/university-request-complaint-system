'use client';

import { useState } from 'react';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  TARGET_UNIT_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/constants';

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

interface PetitionDetailProps {
  petition: Petition;
  onClose: () => void;
}

export function PetitionDetail({ petition, onClose }: PetitionDetailProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Başvuru Detayı</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-row">
            <span className="detail-label">Takip Kodu</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {petition.trackingCode}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Durum</span>
            <span className="detail-value">
              <span className={`status-badge ${STATUS_COLORS[petition.status]}`}>
                {STATUS_LABELS[petition.status]}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Kategori</span>
            <span className="detail-value">
              <span className="cat-badge">
                {CATEGORY_ICONS[petition.category]} {CATEGORY_LABELS[petition.category]}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Hedef Birim</span>
            <span className="detail-value">{TARGET_UNIT_LABELS[petition.targetUnit]}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Konu</span>
            <span className="detail-value" style={{ fontWeight: 600 }}>{petition.konu}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Başvuru Tarihi</span>
            <span className="detail-value">
              {new Date(petition.createdAt).toLocaleDateString('tr-TR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <p className="detail-label" style={{ marginBottom: 8 }}>İÇERİK</p>
            <div className="detail-content-box">{petition.icerik}</div>
          </div>

          {petition.adminNotu && (
            <div className="reply-box">
              <h4>✅ Kurum Yanıtı</h4>
              {petition.cevapTarihi && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {new Date(petition.cevapTarihi).toLocaleDateString('tr-TR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              )}
              <div className="detail-content-box" style={{ background: 'var(--success-bg)', borderLeft: '3px solid var(--success)' }}>
                {petition.adminNotu}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PetitionListProps {
  petitions: Petition[];
}

export function PetitionList({ petitions }: PetitionListProps) {
  const [selected, setSelected] = useState<Petition | null>(null);

  if (petitions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <h3>Henüz başvurunuz bulunmuyor</h3>
        <p>Yeni bir başvuru oluşturmak için "Yeni Başvuru" butonunu kullanın.</p>
      </div>
    );
  }

  return (
    <>
      <div className="petition-list">
        {petitions.map((p) => (
          <div key={p.id} className="petition-item" onClick={() => setSelected(p)}>
            <div className="petition-item-left">
              <div className="petition-tracking">{p.trackingCode}</div>
              <div className="petition-subject">{p.konu}</div>
              <div className="petition-meta">
                <span className="cat-badge">
                  {CATEGORY_ICONS[p.category]} {CATEGORY_LABELS[p.category]}
                </span>
                <span>•</span>
                <span>{TARGET_UNIT_LABELS[p.targetUnit]}</span>
              </div>
            </div>
            <div className="petition-item-right">
              <span className={`status-badge ${STATUS_COLORS[p.status]}`}>
                {STATUS_LABELS[p.status]}
              </span>
              <div className="petition-date">
                {new Date(p.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <PetitionDetail petition={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
