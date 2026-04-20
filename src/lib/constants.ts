export const HOST = window.location.host;

const PRODUCTION_URL = 'https://waterparty-react.onrender.com';

// Detect if we are in a bundled environment (Android/iOS)
const isBundled = window.location.protocol === 'file:' || !!(window as any).Capacitor;

export const API_BASE = isBundled 
  ? PRODUCTION_URL 
  : `${window.location.protocol}//${HOST}`;

export const WS_BASE = isBundled
  ? PRODUCTION_URL.replace('https', 'wss') + '/ws'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${HOST}/ws`;

export const getAssetUrl = (url: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000';
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}/assets/${encodeURIComponent(url)}`;
};
