import {
  AUTH_STORAGE_KEY,
  AUTH_TTL_DAYS,
  DEFAULT_APP_PASSWORD,
} from '@/constants/auth.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function loadAuthPayload(storage = getStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload.expiresAt !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
}

export function saveAuth(
  now = Date.now(),
  ttlDays = AUTH_TTL_DAYS,
  storage = getStorage()
) {
  const expiresAt = now + ttlDays * MS_PER_DAY;
  if (!storage) return { expiresAt, saved: false };
  try {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ expiresAt }));
    return { expiresAt, saved: true };
  } catch {
    return { expiresAt, saved: false };
  }
}

export function clearAuth(storage = getStorage()) {
  if (!storage) return false;
  try {
    storage.removeItem(AUTH_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isAuthValid(now = Date.now(), storage = getStorage()) {
  const payload = loadAuthPayload(storage);
  if (!payload) return false;
  if (payload.expiresAt > now) return true;
  clearAuth(storage);
  return false;
}

export function validatePassword(input, expected = DEFAULT_APP_PASSWORD) {
  return String(input ?? '') === String(expected ?? '');
}

export { MS_PER_DAY };
