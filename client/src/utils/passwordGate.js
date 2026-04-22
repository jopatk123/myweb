import { AUTH_STORAGE_KEY, AUTH_TTL_DAYS } from '@/constants/auth.js';
import { buildApiUrl } from '@/api/httpClient.js';

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

export async function getPasswordStatus() {
  const res = await fetch(buildApiUrl('auth/status'));
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data?.message || '验证服务异常，请稍后重试。');
    error.code = res.status;
    error.payload = data;
    throw error;
  }

  const status = data?.data || {};
  return {
    required: status.required !== false,
    configured: status.configured === true,
  };
}

export async function validatePasswordRemote(input) {
  const res = await fetch(buildApiUrl('auth/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: String(input ?? '') }),
  });
  const data = await res.json();

  if (res.status === 503) {
    const error = new Error(data?.message || '应用访问密码未配置');
    error.code = res.status;
    error.payload = data;
    throw error;
  }

  if (res.status === 401) {
    return false;
  }

  if (!res.ok) {
    const error = new Error(data?.message || '验证服务异常，请稍后重试。');
    error.code = res.status;
    error.payload = data;
    throw error;
  }

  return data.success === true;
}

export async function checkPasswordRequired() {
  try {
    const status = await getPasswordStatus();
    return status.required;
  } catch {
    return true;
  }
}

export { MS_PER_DAY };
