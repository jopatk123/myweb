const rawEnv = import.meta.env ?? {};
const envPassword = String(rawEnv.VITE_APP_PASSWORD || '').trim();

export const DEFAULT_APP_PASSWORD = envPassword || 'asd123123123';

export const AUTH_STORAGE_KEY = 'myweb_app_auth';

export const AUTH_TTL_DAYS = 30;
