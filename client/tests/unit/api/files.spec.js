import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/api/httpClient.js', () => ({
  createApiClient: vi.fn(() => clientMock),
  buildApiUrl: vi.fn(path => `/api${path}`),
  getServerOrigin: vi.fn(() => 'http://localhost:3000'),
}));

async function loadFilesApi() {
  vi.resetModules();
  return import('@/api/files.js');
}

describe('files API', () => {
  beforeEach(() => {
    clientMock.get.mockReset();
    clientMock.post.mockReset();
    clientMock.put.mockReset();
    clientMock.delete.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('creates the client with the long upload timeout', async () => {
    const httpClient = await import('@/api/httpClient.js');
    await loadFilesApi();

    expect(httpClient.createApiClient).toHaveBeenCalledWith({
      timeout: 300000,
    });
  });

  describe('upload', () => {
    it('wraps a single file into FormData with auth headers', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.post.mockResolvedValue({ ok: true });

      const file = new File(['abc'], 'a.txt', { type: 'text/plain' });
      await filesApi.upload(file);

      expect(clientMock.post).toHaveBeenCalledTimes(1);
      const [url, form, config] = clientMock.post.mock.calls[0];
      expect(url).toBe('/files/upload');
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('file')).toBe(file);
      expect(config.headers['X-Api-Base']).toBe('http://localhost:3000');
    });

    it('appends every file when given an array', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.post.mockResolvedValue({});

      const files = [
        new File(['1'], 'one.png', { type: 'image/png' }),
        new File(['2'], 'two.png', { type: 'image/png' }),
      ];
      await filesApi.upload(files);

      const [, form] = clientMock.post.mock.calls[0];
      expect(form.getAll('file')).toEqual(files);
    });

    it('forwards the abort signal to the request config', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.post.mockResolvedValue({});

      const controller = new AbortController();
      await filesApi.upload(
        new File(['x'], 'x.txt'),
        undefined,
        controller.signal
      );

      const [, , config] = clientMock.post.mock.calls[0];
      expect(config.signal).toBe(controller.signal);
    });

    it('reports rounded percentage through onUploadProgress', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.post.mockResolvedValue({});

      const onProgress = vi.fn();
      await filesApi.upload(new File(['x'], 'x.txt'), onProgress);

      const [, , config] = clientMock.post.mock.calls[0];
      config.onUploadProgress({ loaded: 25, total: 200 });
      expect(onProgress).toHaveBeenCalledWith(13, 25, 200);
    });

    it('ignores progress events without a total size', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.post.mockResolvedValue({});

      const onProgress = vi.fn();
      await filesApi.upload(new File(['x'], 'x.txt'), onProgress);

      const [, , config] = clientMock.post.mock.calls[0];
      config.onUploadProgress({ loaded: 25, total: 0 });
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('does not crash when no progress callback is provided', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.post.mockResolvedValue({});

      await filesApi.upload(new File(['x'], 'x.txt'));

      const [, , config] = clientMock.post.mock.calls[0];
      expect(() =>
        config.onUploadProgress({ loaded: 1, total: 1 })
      ).not.toThrow();
    });

    it('propagates upload errors to the caller', async () => {
      const { filesApi } = await loadFilesApi();
      const error = new Error('upload failed');
      clientMock.post.mockRejectedValue(error);

      await expect(filesApi.upload(new File(['x'], 'x.txt'))).rejects.toBe(
        error
      );
    });

    it('omits X-Api-Base when server origin is empty', async () => {
      const httpClient = await import('@/api/httpClient.js');
      httpClient.getServerOrigin.mockReturnValueOnce('');
      const { filesApi } = await loadFilesApi();
      clientMock.post.mockResolvedValue({});

      await filesApi.upload(new File(['x'], 'x.txt'));

      const [, , config] = clientMock.post.mock.calls[0];
      expect(config.headers).toEqual({});
    });
  });

  describe('list / info / delete / downloadUrl', () => {
    it('passes query params for list', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.get.mockResolvedValue({ items: [] });

      await filesApi.list({ page: 2, keyword: 'img' });

      expect(clientMock.get).toHaveBeenCalledWith('/files', {
        params: { page: 2, keyword: 'img' },
        headers: { 'X-Api-Base': 'http://localhost:3000' },
      });
    });

    it('defaults list params to an empty object', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.get.mockResolvedValue({ items: [] });

      await filesApi.list();

      expect(clientMock.get.mock.calls[0][1].params).toEqual({});
    });

    it('requests file info by id', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.get.mockResolvedValue({ id: 'f1' });

      await filesApi.info('f1');

      expect(clientMock.get).toHaveBeenCalledWith('/files/f1', {
        headers: { 'X-Api-Base': 'http://localhost:3000' },
      });
    });

    it('deletes a file by id', async () => {
      const { filesApi } = await loadFilesApi();
      clientMock.delete.mockResolvedValue({});

      await filesApi.delete('f9');

      expect(clientMock.delete).toHaveBeenCalledWith('/files/f9', {
        headers: { 'X-Api-Base': 'http://localhost:3000' },
      });
    });

    it('builds the download url through buildApiUrl', async () => {
      const { filesApi } = await loadFilesApi();

      expect(filesApi.downloadUrl('f3')).toBe('/api/files/f3/download');
    });

    it('propagates list errors', async () => {
      const { filesApi } = await loadFilesApi();
      const error = new Error('network down');
      clientMock.get.mockRejectedValue(error);

      await expect(filesApi.list()).rejects.toBe(error);
    });
  });
});
