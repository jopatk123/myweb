const rawEnv = import.meta.env ?? {};

function normalizeApiBase(base) {
  if (!base) return '/api';
  const trimmed = String(base).trim();
  if (!trimmed) return '/api';
  return trimmed.replace(/\/+$/, '') || '/api';
}

export const appEnv = Object.freeze({
  mode: rawEnv.MODE ?? 'development',
  isProduction: (rawEnv.MODE ?? 'development') === 'production',
  rawApiBase: rawEnv.VITE_API_BASE,
  apiBase: normalizeApiBase(rawEnv.VITE_API_BASE ?? '/api'),
  enableAiLogging: rawEnv.VITE_ENABLE_AI_LOGGING === 'true',
});

export { normalizeApiBase };
