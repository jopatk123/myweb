import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MS_PER_DAY,
  clearAuth,
  getPasswordStatus,
  isAuthValid,
  loadAuthPayload,
  saveAuth,
  validatePasswordRemote,
} from '@/utils/passwordGate.js';
import { AUTH_STORAGE_KEY, AUTH_TTL_DAYS } from '@/constants/auth.js';

vi.mock('@/api/httpClient.js', () => ({
  buildApiUrl: vi.fn(p => `http://localhost:3000/api/${p}`),
}));

const TEST_PASSWORD = 'test-password-123';

const makeResponse = ({ ok = true, status = 200, data = {} } = {}) => ({
  ok,
  status,
  json: async () => data,
});

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
      vi
        .fn()
        .mockResolvedValue(makeResponse({ data: { success: true, code: 200 } }))
    );
    expect(await validatePasswordRemote('correct')).toBe(true);
  });

  it('密码错误时返回 false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 401,
          data: { success: false, code: 401 },
        })
      )
    );
    expect(await validatePasswordRemote('wrong')).toBe(false);
  });

  it('网络异常时向上抛出错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));
    await expect(validatePasswordRemote('any')).rejects.toThrow('fail');
  });

  it('input 为 null 时不崩溃', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 401,
          data: { success: false, code: 401 },
        })
      )
    );
    expect(await validatePasswordRemote(null)).toBe(false);
  });
});

function createMemoryStorage2() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: key => {
      store.delete(key);
    },
  };
}

describe('loadAuthPayload / saveAuth / clearAuth 边界', () => {
  it('损坏的 JSON 返回 null', () => {
    const storage = createMemoryStorage2();
    storage.setItem(AUTH_STORAGE_KEY, '{oops');

    expect(loadAuthPayload(storage)).toBeNull();
  });

  it('expiresAt 不是数字时返回 null', () => {
    const storage = createMemoryStorage2();
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ expiresAt: 'soon' }));
    expect(loadAuthPayload(storage)).toBeNull();

    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({}));
    expect(loadAuthPayload(storage)).toBeNull();
  });

  it('saveAuth 即使没有 storage 也能计算过期时间', () => {
    const now = 1_000_000;
    const result = saveAuth(now, 7, null);

    expect(result.saved).toBe(false);
    expect(result.expiresAt).toBe(now + 7 * MS_PER_DAY);
  });

  it('没有 storage 时各操作安全降级', () => {
    expect(loadAuthPayload(null)).toBeNull();
    expect(clearAuth(null)).toBe(false);
    expect(isAuthValid(Date.now(), null)).toBe(false);
  });

  it('缺省参数时读写真实 window.localStorage', () => {
    try {
      localStorage.clear();
      expect(isAuthValid()).toBe(false);

      const saved = saveAuth();
      expect(saved.saved).toBe(true);
      expect(loadAuthPayload()).toEqual({ expiresAt: saved.expiresAt });
      expect(isAuthValid()).toBe(true);

      expect(clearAuth()).toBe(true);
      expect(isAuthValid()).toBe(false);
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  });
});

describe('getPasswordStatus', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('返回归一化后的状态标志', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse({
          data: {
            data: { required: false, configured: true, authenticated: true },
          },
        })
      )
    );

    const status = await getPasswordStatus();

    expect(status).toEqual({
      required: false,
      configured: true,
      authenticated: true,
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/status',
      {
        credentials: 'include',
      }
    );
  });

  it('空载荷时 required 默认 true、configured/authenticated 默认 false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse({ data: {} }))
    );

    expect(await getPasswordStatus()).toEqual({
      required: true,
      configured: false,
      authenticated: false,
    });
  });

  it('服务失败时抛出携带 code 与 payload 的错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 500,
          data: { message: '服务不可用', code: 500 },
        })
      )
    );

    await expect(getPasswordStatus()).rejects.toMatchObject({
      message: '服务不可用',
      code: 500,
    });
  });

  it('JSON 解析失败时回退到通用文案与空 payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('bad json');
        },
      })
    );

    await expect(getPasswordStatus()).rejects.toMatchObject({
      message: '验证服务异常，请稍后重试。',
      code: 502,
      payload: {},
    });
  });
});

describe('validatePasswordRemote 请求契约与状态码分支', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('以 JSON 形式 POST 密码到 verify 接口', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeResponse({ data: { success: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await validatePasswordRemote('secret');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/verify',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'secret' }),
      }
    );
  });

  it('input 为 undefined 时密码序列化为空字符串', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makeResponse({ ok: false, status: 401, data: { success: false } })
      );
    vi.stubGlobal('fetch', fetchMock);

    await validatePasswordRemote(undefined);

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ password: '' })
    );
  });

  it('503 视为「密码未配置」错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 503,
          data: { message: '应用访问密码未配置' },
        })
      )
    );

    await expect(validatePasswordRemote('x')).rejects.toMatchObject({
      message: '应用访问密码未配置',
      code: 503,
    });
  });

  it('其余非 2xx 状态抛出通用错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 500,
          data: { code: 500 },
        })
      )
    );

    await expect(validatePasswordRemote('x')).rejects.toMatchObject({
      message: '验证服务异常，请稍后重试。',
      code: 500,
    });
  });

  it('res.ok 缺失时根据状态码推导成功', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ success: true }),
      })
    );

    expect(await validatePasswordRemote('x')).toBe(true);
  });

  it('无状态码且 success=false 时返回 false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: async () => ({ success: false }) })
    );

    expect(await validatePasswordRemote('x')).toBe(false);
  });

  it('成功响应但 success 非布尔真值时返回 false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse({ data: { success: 'yes' } }))
    );

    expect(await validatePasswordRemote('x')).toBe(false);
  });
});
