export const HOST = typeof window !== 'undefined' ? window.location.host : '';

const isBrowser = typeof window !== 'undefined' && window.location;

// Detect Capacitor / Native webview environment
export const isCapacitor = typeof window !== 'undefined' && (
  (window as any).Capacitor || 
  window.location.protocol === 'capacitor:' || 
  window.location.origin.startsWith('capacitor://') ||
  (window.location.origin.startsWith('http://localhost') && !window.location.port)
);

// Determine the base URL for API and WebSockets
// Use the Google development server in development, and the Render live server in production/release
const getAppUrl = (): string => {
  try {
    const envUrl = process.env.APP_URL;
    if (envUrl && envUrl.includes('run.app')) {
      return 'https://ais-pre-lr54twg5655e4thhbtygne-661033979019.us-east1.run.app';
    }
  } catch (e) {}
  
  if ((import.meta as any).env?.DEV) {
    return 'https://ais-pre-lr54twg5655e4thhbtygne-661033979019.us-east1.run.app';
  }
  
  return 'https://waterparty-react-14hr.onrender.com';
};

export const rawAppUrl = getAppUrl();

// Use relative paths on standard web to avoid CORS, but use absolute URL inside Capacitor (Android/iOS)
export const API_BASE = isCapacitor 
  ? (rawAppUrl.endsWith('/') ? rawAppUrl.slice(0, -1) : rawAppUrl) 
  : '';

export const WS_BASE = (() => {
  if (isCapacitor && rawAppUrl) {
    const wsUrl = rawAppUrl.replace(/^http/, 'ws');
    return wsUrl.endsWith('/') ? wsUrl + 'ws' : wsUrl + '/ws';
  }
  return (isBrowser ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws' : '/ws');
})();

export const getAssetUrl = (url: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000';
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}/assets/${encodeURIComponent(url)}`;
};
