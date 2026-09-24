import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/api/httpClient.js', () => ({
  createApiClient: vi.fn(() => clientMock),
}));

async function loadWallpaperApi() {
  vi.resetModules();
  return import('@/api/wallpaper.js');
}

describe('wallpaper API', () => {
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
    await loadWallpaperApi();

    expect(httpClient.createApiClient).toHaveBeenCalledWith({
      timeout: 300000,
    });
  });

  describe('getWallpapers params', () => {
    it('sends no params when group/page/limit are omitted', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.get.mockResolvedValue({ items: [] });

      await wallpaperApi.getWallpapers();

      expect(clientMock.get).toHaveBeenCalledWith('/wallpapers', {
        params: {},
      });
    });

    it('keeps falsy-but-valid page and limit values', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.get.mockResolvedValue({ items: [] });

      await wallpaperApi.getWallpapers(null, 0, 0);

      expect(clientMock.get.mock.calls[0][1].params).toEqual({
        page: 0,
        limit: 0,
      });
    });

    it('sends groupId together with pagination', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.get.mockResolvedValue({ items: [], total: 1 });

      await wallpaperApi.getWallpapers('g1', 1, 20);

      expect(clientMock.get.mock.calls[0][1].params).toEqual({
        groupId: 'g1',
        page: 1,
        limit: 20,
      });
    });

    it('skips empty-string groupId and undefined page/limit', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.get.mockResolvedValue({ items: [] });

      await wallpaperApi.getWallpapers('', 2, undefined);

      expect(clientMock.get.mock.calls[0][1].params).toEqual({ page: 2 });
    });

    it('skips an undefined groupId', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.get.mockResolvedValue({ items: [] });

      await wallpaperApi.getWallpapers(undefined);

      expect(clientMock.get.mock.calls[0][1].params).toEqual({});
    });
  });

  it('fetches a single wallpaper by id', async () => {
    const { wallpaperApi } = await loadWallpaperApi();
    clientMock.get.mockResolvedValue({ id: 'w1' });

    await wallpaperApi.getWallpaper('w1');

    expect(clientMock.get).toHaveBeenCalledWith('/wallpapers/w1');
  });

  describe('uploadWallpaper', () => {
    it('appends image plus optional groupId and name', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.post.mockResolvedValue({});
      const file = new File(['img'], 'wall.png', { type: 'image/png' });

      await wallpaperApi.uploadWallpaper(file, 'g2', '我的壁纸');

      const [url, form, config] = clientMock.post.mock.calls[0];
      expect(url).toBe('/wallpapers');
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('image')).toBe(file);
      expect(form.get('groupId')).toBe('g2');
      expect(form.get('name')).toBe('我的壁纸');
      expect(config.headers['Content-Type']).toBe('multipart/form-data');
    });

    it('omits groupId/name when not provided', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.post.mockResolvedValue({});
      const file = new File(['img'], 'wall.png', { type: 'image/png' });

      await wallpaperApi.uploadWallpaper(file);

      const [, form] = clientMock.post.mock.calls[0];
      expect(form.get('image')).toBe(file);
      expect(form.has('groupId')).toBe(false);
      expect(form.has('name')).toBe(false);
    });

    it('reports rounded upload percentage', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.post.mockResolvedValue({});
      const onProgress = vi.fn();

      await wallpaperApi.uploadWallpaper(
        new File(['img'], 'wall.png'),
        null,
        undefined,
        onProgress
      );

      const [, , config] = clientMock.post.mock.calls[0];
      config.onUploadProgress({ loaded: 33, total: 100 });
      expect(onProgress).toHaveBeenCalledWith(33);
    });

    it('propagates upload errors', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      const error = new Error('quota exceeded');
      clientMock.post.mockRejectedValue(error);

      await expect(
        wallpaperApi.uploadWallpaper(new File(['img'], 'wall.png'))
      ).rejects.toBe(error);
    });
  });

  it('updates a wallpaper by id', async () => {
    const { wallpaperApi } = await loadWallpaperApi();
    const data = { name: 'renamed' };
    clientMock.put.mockResolvedValue({});

    await wallpaperApi.updateWallpaper('w1', data);

    expect(clientMock.put).toHaveBeenCalledWith('/wallpapers/w1', data);
  });

  it('deletes a wallpaper by id', async () => {
    const { wallpaperApi } = await loadWallpaperApi();
    clientMock.delete.mockResolvedValue({});

    await wallpaperApi.deleteWallpaper('w2');

    expect(clientMock.delete).toHaveBeenCalledWith('/wallpapers/w2');
  });

  it('batch deletes wallpapers with ids in the body', async () => {
    const { wallpaperApi } = await loadWallpaperApi();
    clientMock.delete.mockResolvedValue({});

    await wallpaperApi.deleteWallpapers(['a', 'b']);

    expect(clientMock.delete).toHaveBeenCalledWith('/wallpapers', {
      data: { ids: ['a', 'b'] },
    });
  });

  it('moves wallpapers to a group', async () => {
    const { wallpaperApi } = await loadWallpaperApi();
    clientMock.put.mockResolvedValue({});

    await wallpaperApi.moveWallpapers(['a', 'b'], 'g3');

    expect(clientMock.put).toHaveBeenCalledWith('/wallpapers/move', {
      ids: ['a', 'b'],
      groupId: 'g3',
    });
  });

  it('gets and sets the active wallpaper', async () => {
    const { wallpaperApi } = await loadWallpaperApi();
    clientMock.get.mockResolvedValue({ id: 'active' });
    clientMock.put.mockResolvedValue({});

    await wallpaperApi.getActiveWallpaper();
    await wallpaperApi.setActiveWallpaper('w5');

    expect(clientMock.get).toHaveBeenCalledWith('/wallpapers/active');
    expect(clientMock.put).toHaveBeenCalledWith('/wallpapers/w5/active');
  });

  it('requests a random wallpaper with the group param', async () => {
    const { wallpaperApi } = await loadWallpaperApi();
    clientMock.get.mockResolvedValue({ id: 'rand' });

    await wallpaperApi.getRandomWallpaper('g9');

    expect(clientMock.get).toHaveBeenCalledWith('/wallpapers/random', {
      params: { groupId: 'g9' },
    });
  });

  describe('groups', () => {
    it('lists all groups and reads the current group', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.get.mockResolvedValue([]);

      await wallpaperApi.getGroups();
      await wallpaperApi.getCurrentGroup();

      expect(clientMock.get).toHaveBeenNthCalledWith(
        1,
        '/wallpapers/groups/all'
      );
      expect(clientMock.get).toHaveBeenNthCalledWith(
        2,
        '/wallpapers/groups/current'
      );
    });

    it('creates, switches, updates and deletes groups', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.post.mockResolvedValue({});
      clientMock.put.mockResolvedValue({});
      clientMock.delete.mockResolvedValue({});

      await wallpaperApi.createGroup({ name: 'new' });
      await wallpaperApi.setCurrentGroup('g1');
      await wallpaperApi.updateGroup('g1', { name: 'renamed' });
      await wallpaperApi.deleteGroup('g1');

      expect(clientMock.post).toHaveBeenCalledWith('/wallpapers/groups', {
        name: 'new',
      });
      expect(clientMock.put).toHaveBeenCalledWith(
        '/wallpapers/groups/g1/current'
      );
      expect(clientMock.put).toHaveBeenCalledWith('/wallpapers/groups/g1', {
        name: 'renamed',
      });
      expect(clientMock.delete).toHaveBeenCalledWith('/wallpapers/groups/g1');
    });
  });

  describe('downloadWallpapers', () => {
    it('requests a blob with the long download timeout', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.post.mockResolvedValue(new Blob(['zip']));

      await wallpaperApi.downloadWallpapers(['a', 'b']);

      expect(clientMock.post).toHaveBeenCalledWith(
        '/wallpapers/download',
        { ids: ['a', 'b'] },
        { responseType: 'blob', timeout: 600000 }
      );
    });

    it('lets options override the default config', async () => {
      const { wallpaperApi } = await loadWallpaperApi();
      clientMock.post.mockResolvedValue(new Blob(['zip']));

      await wallpaperApi.downloadWallpapers(['a'], { timeout: 5000 });

      expect(clientMock.post).toHaveBeenCalledWith(
        '/wallpapers/download',
        { ids: ['a'] },
        { responseType: 'blob', timeout: 5000 }
      );
    });
  });
});
