export const HOST = window.location.host;

const isBrowser = typeof window !== 'undefined' && window.location;

const PRODUCTION_URL = (isBrowser && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1'))
  ? window.location.origin
  : 'https://waterparty-react.onrender.com';

export const API_BASE = PRODUCTION_URL;

export const WS_BASE = PRODUCTION_URL.replace('http', 'ws') + '/ws';

export const getAssetUrl = (url: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000';
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}/assets/${encodeURIComponent(url)}`;
};
