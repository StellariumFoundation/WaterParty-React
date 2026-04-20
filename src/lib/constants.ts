export const HOST = window.location.host;

const PRODUCTION_URL = 'https://ais-dev-lr54twg5655e4thhbtygne-661033979019.us-east1.run.app';

export const API_BASE = window.location.protocol === 'file:' 
  ? PRODUCTION_URL 
  : `${window.location.protocol}//${HOST}`;
export const WS_BASE = window.location.protocol === 'file:'
  ? PRODUCTION_URL.replace('https', 'wss') + '/ws'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${HOST}/ws`;
export const getAssetUrl = (url: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000';
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}/assets/${encodeURIComponent(url)}`;
};
