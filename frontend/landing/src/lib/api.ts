/** Dirección del backend del SAT. Configurable con VITE_SAT_API_URL en despliegues. */
export const API_BASE = (
  import.meta.env["VITE_SAT_API_URL"] || "http://127.0.0.1:8000"
).replace(/\/$/, "");

/** Cadencia de refresco de las consultas al backend. */
export const REFRESH_INTERVAL = 5 * 60 * 1000;