export const HOST = 'waterparty.onrender.com';
export const API_BASE = `https://${HOST}`;
export const WS_BASE = `wss://${HOST}/ws`;
export const getAssetUrl = (hash: string) => `${API_BASE}/assets/${hash}`;
