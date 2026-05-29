export const HOST = typeof window !== 'undefined' ? window.location.host : '';

const isBrowser = typeof window !== 'undefined' && window.location;

// Use relative paths to avoid CORS issues if hosted on the same domain
export const API_BASE = '';

export const WS_BASE = (isBrowser ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws' : '/ws');

export const getAssetUrl = (url: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000';
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}/assets/${encodeURIComponent(url)}`;
};
