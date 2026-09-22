const env = (key, fallback) => import.meta.env[key] ?? fallback;

export const API_URL = env('REACT_APP_API_URL', 'http://localhost:3001/api');
export const WS_URL = env('REACT_APP_WS_URL', 'ws://localhost:8080');
export const STATS_API_URL = env('REACT_APP_STATS_API', 'http://localhost:5000/api');
export const APP_ENV = env('REACT_APP_ENV', 'development');