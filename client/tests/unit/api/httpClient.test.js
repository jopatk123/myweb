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

  it('attaches the shared response interceptor and normalizes errors', async () => {
    const { createApiClient } = await loadHttpClientModule();

    const client = createApiClient({ timeout: 123 });

    expect(axiosMocks.create).toHaveBeenCalledWith({
      baseURL: '/api',
      timeout: 123,
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

    expect(unwrapData({ data: { data: { value: 1 } } })).toEqual({ value: 1 });
    expect(unwrapData({ data: { value: 2 } })).toEqual({ value: 2 });
    expect(unwrapData({ value: 3 })).toEqual({ value: 3 });
    expect(unwrapData(null)).toBeNull();
  });
});
