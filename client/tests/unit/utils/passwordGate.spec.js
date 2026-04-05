import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MS_PER_DAY,
  clearAuth,
  isAuthValid,
  loadAuthPayload,
  saveAuth,
  validatePasswordRemote,
  checkPasswordRequired,
} from '@/utils/passwordGate.js';
import { AUTH_STORAGE_KEY, AUTH_TTL_DAYS } from '@/constants/auth.js';

vi.mock('@/api/httpClient.js', () => ({
  buildApiUrl: vi.fn(p => `http://localhost:3000/api/${p}`),
}));

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

describe('validatePasswordRemote', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('密码正确时返回 true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      })
    );
    expect(await validatePasswordRemote('correct')).toBe(true);
  });

  it('密码错误时返回 false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ success: false }),
      })
    );
    expect(await validatePasswordRemote('wrong')).toBe(false);
  });

  it('网络异常时返回 false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));
    expect(await validatePasswordRemote('any')).toBe(false);
  });

  it('input 为 null 时不崩溃', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ success: false }),
      })
    );
    expect(await validatePasswordRemote(null)).toBe(false);
  });
});

describe('checkPasswordRequired', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('后端 required=true 时返回 true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ data: { required: true } }),
      })
    );
    expect(await checkPasswordRequired()).toBe(true);
  });

  it('后端 required=false 时返回 false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ data: { required: false } }),
      })
    );
    expect(await checkPasswordRequired()).toBe(false);
  });

  it('fetch 失败时默认返回 true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await checkPasswordRequired()).toBe(true);
  });
});
