import { afterEach, describe, expect, it, vi } from 'vitest';

const axiosMocks = vi.hoisted(() => {
  const responseUse = vi.fn();
  const client = {
    interceptors: {
      response: {
        use: responseUse,
      },
    },
  };

  const create = vi.fn(() => client);

  return {
    responseUse,
    client,
    create,
  };
});

vi.mock('axios', () => ({
  default: {
    create: axiosMocks.create,
  },
}));

vi.mock('@/constants/env.js', () => ({
  appEnv: {
    apiBase: '/api',
    rawApiBase: '/api',
  },
  normalizeApiBase: value => value,
}));

async function loadHttpClientModule() {
  vi.resetModules();
  return import('@/api/httpClient.js');
}

describe('api/httpClient', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createApiClient & interceptors', () => {
    it('attaches the shared response interceptor and normalizes errors', async () => {
      const { createApiClient } = await loadHttpClientModule();

      const client = createApiClient({ timeout: 123 });

      expect(axiosMocks.create).toHaveBeenCalledWith({
        baseURL: '/api',
        timeout: 123,
        withCredentials: true,
      });
      expect(client).toBe(axiosMocks.client);
      expect(axiosMocks.responseUse).toHaveBeenCalledTimes(1);

      const [onFulfilled, onRejected] = axiosMocks.responseUse.mock.calls[0];

      expect(onFulfilled({ data: { ok: true } })).toEqual({ ok: true });

      await expect(
        onRejected({
          response: {
            data: {
              message: 'bad request',
              code: 400,
              details: { field: 'name' },
            },
          },
        })
      ).rejects.toMatchObject({
        name: 'ApiError',
        message: 'bad request',
        code: 400,
        payload: {
          message: 'bad request',
          code: 400,
          details: { field: 'name' },
        },
      });
    });

    it('unwraps nested data payloads without changing plain values', async () => {
      const { unwrapData } = await loadHttpClientModule();

      expect(unwrapData({ data: { data: { value: 1 } } })).toEqual({
        value: 1,
      });
      expect(unwrapData({ data: { value: 2 } })).toEqual({ value: 2 });
      expect(unwrapData({ value: 3 })).toEqual({ value: 3 });
      expect(unwrapData(null)).toBeNull();
    });
  });

  describe('getApiBase', () => {
    it('returns the API base URL', async () => {
      const { getApiBase } = await loadHttpClientModule();
      const base = getApiBase();
      expect(typeof base).toBe('string');
      expect(base).toBeTruthy();
    });
  });

  describe('buildApiUrl', () => {
    it('returns base URL when no path given', async () => {
      const { buildApiUrl, getApiBase } = await loadHttpClientModule();
      const url = buildApiUrl();
      expect(url).toBe(getApiBase());
    });

    it('appends path to base URL', async () => {
      const { buildApiUrl } = await loadHttpClientModule();
      const url = buildApiUrl('files');
      expect(url).toContain('files');
    });

    it('strips leading slashes from path', async () => {
      const { buildApiUrl } = await loadHttpClientModule();
      const url = buildApiUrl('/users');
      expect(url).not.toContain('//users');
    });

    it('returns full URL if path is already absolute', async () => {
      const { buildApiUrl } = await loadHttpClientModule();
      const url = buildApiUrl('https://example.com/api');
      expect(url).toBe('https://example.com/api');
    });

    it('returns full URL for http paths', async () => {
      const { buildApiUrl } = await loadHttpClientModule();
      const url = buildApiUrl('http://localhost:3000/api');
      expect(url).toBe('http://localhost:3000/api');
    });
  });

  describe('getServerOrigin', () => {
    it('returns window.location.origin for relative base', async () => {
      const { getServerOrigin } = await loadHttpClientModule();
      const origin = getServerOrigin();
      // In jsdom, window.location.origin should be available
      expect(typeof origin).toBe('string');
    });
  });

  describe('buildServerUrl', () => {
    it('returns origin when no path', async () => {
      const { buildServerUrl } = await loadHttpClientModule();
      const result = buildServerUrl();
      expect(typeof result).toBe('string');
    });

    it('appends path to origin', async () => {
      const { buildServerUrl } = await loadHttpClientModule();
      const result = buildServerUrl('/uploads/test.png');
      expect(result).toContain('/uploads/test.png');
    });

    it('adds leading slash if missing', async () => {
      const { buildServerUrl } = await loadHttpClientModule();
      const result = buildServerUrl('uploads/test.png');
      expect(result).toContain('/uploads/test.png');
    });
  });
});
