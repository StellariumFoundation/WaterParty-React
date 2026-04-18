export const HOST = window.location.host;
export const API_BASE = `${window.location.protocol}//${HOST}`;
export const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${HOST}/ws`;
export const getAssetUrl = (hash: string) => `${API_BASE}/assets/${encodeURIComponent(hash)}`;
