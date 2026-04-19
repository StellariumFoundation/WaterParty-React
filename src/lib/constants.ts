export const HOST = window.location.host;
export const API_BASE = `${window.location.protocol}//${HOST}`;
export const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${HOST}/ws`;
export const getAssetUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}/assets/${encodeURIComponent(url)}`;
};
