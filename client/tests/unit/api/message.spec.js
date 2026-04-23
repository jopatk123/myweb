import { describe, expect, it, vi } from 'vitest';

const requestUse = vi.fn();
const clientMock = {
  interceptors: {
    request: {
      use: requestUse,
    },
  },
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  put: vi.fn(),
};

vi.mock('@/api/httpClient.js', () => ({
  createApiClient: vi.fn(() => clientMock),
  getApiBase: vi.fn(() => '/api'),
}));

vi.mock('@/store/sessionState.js', () => ({
  ensureSessionId: vi.fn(() => 'session-from-store'),
}));

vi.mock('@/utils/storage.js', () => ({
  readStorageItem: vi.fn(() => 'admin-token-1'),
}));

describe('message API', () => {
  it('injects the shared session id into request headers', async () => {
    vi.resetModules();
    const { messageAPI } = await import('@/api/message.js');

    expect(messageAPI).toBeDefined();
    expect(requestUse).toHaveBeenCalledTimes(1);

    const requestHandler = requestUse.mock.calls[0][0];
    const config = { headers: {} };

    expect(requestHandler(config)).toBe(config);
    expect(config.headers['X-Session-Id']).toBe('session-from-store');
  });
});
