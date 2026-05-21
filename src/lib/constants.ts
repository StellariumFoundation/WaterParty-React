export const HOST = window.location.host;

const PRODUCTION_URL = 'https://waterparty-react.onrender.com';

export const API_BASE = PRODUCTION_URL;

export const WS_BASE = PRODUCTION_URL.replace('https', 'wss') + '/ws';

export const getAssetUrl = (url: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000';
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}/assets/${encodeURIComponent(url)}`;
};
