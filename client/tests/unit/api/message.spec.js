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

async function loadMessageApi() {
  vi.resetModules();
  return import('@/api/message.js');
}

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

  it('creates a header object when config.headers is missing', async () => {
    vi.resetModules();
    await import('@/api/message.js');

    const requestHandler = requestUse.mock.calls[0][0];
    const config = {};

    expect(requestHandler(config)).toBe(config);
    expect(config.headers['X-Session-Id']).toBe('session-from-store');
  });

  it('builds the client on top of the messages base URL', async () => {
    const httpClient = await import('@/api/httpClient.js');
    await loadMessageApi();

    expect(httpClient.createApiClient).toHaveBeenCalledWith({
      baseURL: '/api/messages',
      timeout: 10000,
    });
  });

  it('getMessages forwards query params', async () => {
    const { messageAPI } = await loadMessageApi();

    await messageAPI.getMessages({ page: 2, keyword: 'hi' });

    expect(clientMock.get).toHaveBeenCalledWith('/', {
      params: { page: 2, keyword: 'hi' },
    });
  });

  it('getMessages defaults params to an empty object', async () => {
    const { messageAPI } = await loadMessageApi();

    await messageAPI.getMessages();

    expect(clientMock.get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('sendMessage posts the message payload', async () => {
    const { messageAPI } = await loadMessageApi();
    const payload = { content: 'hello', images: [] };

    await messageAPI.sendMessage(payload);

    expect(clientMock.post).toHaveBeenCalledWith('/', payload);
  });

  it('deleteMessage targets the message id', async () => {
    const { messageAPI } = await loadMessageApi();

    await messageAPI.deleteMessage('m42');

    expect(clientMock.delete).toHaveBeenCalledWith('/m42');
  });

  it('reads and updates user settings', async () => {
    const { messageAPI } = await loadMessageApi();
    const settings = { nickname: 'tom' };

    await messageAPI.getUserSettings();
    await messageAPI.updateUserSettings(settings);

    expect(clientMock.get).toHaveBeenCalledWith('/user-settings');
    expect(clientMock.put).toHaveBeenCalledWith('/user-settings', settings);
  });

  it('uploadImages appends every file as "images"', async () => {
    const { messageAPI } = await loadMessageApi();
    const files = [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
    ];

    await messageAPI.uploadImages(files);

    expect(clientMock.post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = clientMock.post.mock.calls[0];
    expect(url).toBe('/upload-image');
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.getAll('images')).toEqual(files);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });

  it('clearAllMessages sends the confirm flag in the body', async () => {
    const { messageAPI } = await loadMessageApi();

    await messageAPI.clearAllMessages();

    expect(clientMock.delete).toHaveBeenCalledWith('/clear-all', {
      data: { confirm: true },
    });
  });

  it('propagates request failures', async () => {
    const { messageAPI } = await loadMessageApi();
    const error = new Error('message board down');
    clientMock.get.mockRejectedValue(error);

    await expect(messageAPI.getMessages()).rejects.toBe(error);
  });
});
