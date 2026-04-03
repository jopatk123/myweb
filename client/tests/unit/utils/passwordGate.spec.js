import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MS_PER_DAY,
  clearAuth,
  isAuthValid,
  loadAuthPayload,
  saveAuth,
} from '@/utils/passwordGate.js';
import { AUTH_STORAGE_KEY, AUTH_TTL_DAYS } from '@/constants/auth.js';

const TEST_PASSWORD = 'test-password-123';

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
    vi.stubEnv('VITE_APP_PASSWORD', TEST_PASSWORD);
    storage = createMemoryStorage();
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
