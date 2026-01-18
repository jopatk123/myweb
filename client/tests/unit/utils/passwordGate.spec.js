import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUTH_STORAGE_KEY,
  AUTH_TTL_DAYS,
  DEFAULT_APP_PASSWORD,
} from '@/constants/auth.js';
import {
  MS_PER_DAY,
  clearAuth,
  isAuthValid,
  loadAuthPayload,
  saveAuth,
  validatePassword,
} from '@/utils/passwordGate.js';

describe('passwordGate utils', () => {
  const createMemoryStorage = () => {
    const store = new Map();
    return {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: key => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    };
  };

  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('validates password against default', () => {
    expect(validatePassword(DEFAULT_APP_PASSWORD)).toBe(true);
    expect(validatePassword('wrong-password')).toBe(false);
  });

  it('returns false when no auth payload', () => {
    expect(isAuthValid(Date.now(), storage)).toBe(false);
  });

  it('saves auth payload with ttl days', () => {
    const now = new Date('2026-01-01T00:00:00Z').getTime();
    const result = saveAuth(now, AUTH_TTL_DAYS, storage);

    expect(result.saved).toBe(true);
    expect(result.expiresAt).toBe(now + AUTH_TTL_DAYS * MS_PER_DAY);

    const stored = loadAuthPayload(storage);
    expect(stored.expiresAt).toBe(result.expiresAt);
    expect(isAuthValid(now + MS_PER_DAY, storage)).toBe(true);
  });

  it('invalidates expired auth payload and clears storage', () => {
    const now = new Date('2026-01-01T00:00:00Z').getTime();
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ expiresAt: now - 1000 })
    );

    expect(isAuthValid(now, storage)).toBe(false);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBe(null);
  });

  it('clears auth payload explicitly', () => {
    saveAuth(Date.now(), AUTH_TTL_DAYS, storage);
    const cleared = clearAuth(storage);

    expect(cleared).toBe(true);
    expect(loadAuthPayload(storage)).toBe(null);
  });
});
