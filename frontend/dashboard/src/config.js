const env = (key, fallback) => import.meta.env[key] ?? fallback;

export const API_URL = env('VITE_API_URL', 'http://localhost:8000');
export const WS_URL = env('VITE_WS_URL', 'ws://localhost:8080');
export const STATS_API_URL = env('VITE_STATS_API', 'http://localhost:5000/api');
export const APP_ENV = env('VITE_ENV', 'development');