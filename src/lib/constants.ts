export const USER_TYPE_LABELS: Record<string, string> = {
  ACADEMIC: 'İç / Akademik Personel',
  STUDENT: 'İç / Öğrenci',
  CITIZEN: 'Dış / Vatandaş',
};

export const CATEGORY_LABELS: Record<string, string> = {
  TALEP: 'Talep',
  SIKAYET: 'Şikayet',
  BILGI_EDINME: 'Bilgi Edinme',
  TESEKKUR: 'Teşekkür',
  ONERI: 'Öneri',
};

export const CATEGORY_ICONS: Record<string, string> = {
  TALEP: '📋',
  SIKAYET: '⚠️',
  BILGI_EDINME: 'ℹ️',
  TESEKKUR: '🙏',
  ONERI: '💡',
};

export const TARGET_UNIT_LABELS: Record<string, string> = {
  REKTORLUK: 'Rektörlük',
  OGRENCI_ISLERI: 'Öğrenci İşleri Daire Başkanlığı',
  FEN_BILIMLERI: 'Fen Bilimleri Fakültesi Dekanlığı',
  EDEBIYAT: 'Edebiyat Fakültesi Dekanlığı',
  MUHENDISLIK: 'Mühendislik Fakültesi Dekanlığı',
  IKTISAT: 'İktisadi ve İdari Bilimler Fakültesi Dekanlığı',
  TIP: 'Tıp Fakültesi Dekanlığı',
  HUKUK: 'Hukuk Fakültesi Dekanlığı',
  EGITIM: 'Eğitim Fakültesi Dekanlığı',
  BILGI_ISLEM: 'Bilgi İşlem Daire Başkanlığı',
  YAPI_ISLER: 'Yapı İşleri ve Teknik Daire Başkanlığı',
  KÜTÜPHANE: 'Kütüphane ve Dokümantasyon Daire Başkanlığı',
  SAGLIK_KULTUR: 'Sağlık, Kültür ve Spor Daire Başkanlığı',
};

export const STATUS_LABELS: Record<string, string> = {
  BEKLEMEDE: 'Beklemede',
  INCELEMEDE: 'İncelemede',
  CEVAPLANDI: 'Cevaplandı',
  KAPATILDI: 'Kapatıldı',
};

export const STATUS_COLORS: Record<string, string> = {
  BEKLEMEDE: 'status-beklemede',
  INCELEMEDE: 'status-incelemede',
  CEVAPLANDI: 'status-cevaplandi',
  KAPATILDI: 'status-kapatildi',
};

export function generateTrackingCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `MER${year}${random}`;
}
