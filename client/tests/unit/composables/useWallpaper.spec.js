const apiMocks = vi.hoisted(() => {
  const methods = [
    'getWallpapers',
    'deleteWallpaper',
    'updateWallpaper',
    'getActiveWallpaper',
    'deleteWallpapers',
    'moveWallpapers',
    'setActiveWallpaper',
    'getRandomWallpaper',
    'uploadWallpaper',
    'getGroups',
    'getCurrentGroup',
    'createGroup',
    'deleteGroup',
    'setCurrentGroup',
    'downloadWallpapers',
  ];
  const mocked = {};
  for (const name of methods) {
    mocked[name] = vi.fn();
  }
  return mocked;
});

vi.mock('@/api/wallpaper.js', () => ({
  wallpaperApi: apiMocks,
}));

vi.mock('@/constants/env.js', () => ({
  appEnv: {
    apiBase: 'http://localhost:3000/api',
  },
}));

import { ref } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';

describe('useWallpaper composable', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach(fn => fn.mockReset());
  });

  it('resolves ref group ids when deleting a single wallpaper', async () => {
    apiMocks.deleteWallpaper.mockResolvedValue();
    apiMocks.getWallpapers.mockResolvedValue({ data: { items: [], total: 0 } });
    apiMocks.getActiveWallpaper.mockResolvedValue({ data: null });

    const { deleteWallpaper, activeWallpaper } = useWallpaper();
    activeWallpaper.value = { id: 42 };

    const groupRef = ref('7');
    await deleteWallpaper(42, groupRef);

    expect(apiMocks.deleteWallpaper).toHaveBeenCalledWith(42);
    expect(apiMocks.getWallpapers).toHaveBeenCalledWith('7', 1, 20);
    expect(apiMocks.getActiveWallpaper).toHaveBeenCalledTimes(1);
  });

  it('refreshes active wallpaper when bulk deletion removes it', async () => {
    apiMocks.deleteWallpapers.mockResolvedValue();
    apiMocks.getWallpapers.mockResolvedValue({ data: { items: [], total: 0 } });
    apiMocks.getActiveWallpaper.mockResolvedValue({ data: { id: null } });

    const { deleteMultipleWallpapers, activeWallpaper } = useWallpaper();
    activeWallpaper.value = { id: 5 };

    await deleteMultipleWallpapers([3, 5], ref(9));

    expect(apiMocks.deleteWallpapers).toHaveBeenCalledWith([3, 5]);
    expect(apiMocks.getWallpapers).toHaveBeenCalledWith(9, 1, 20);
    expect(apiMocks.getActiveWallpaper).toHaveBeenCalledTimes(1);
  });

  it('unwraps refs for move operations', async () => {
    apiMocks.moveWallpapers.mockResolvedValue();
    apiMocks.getWallpapers.mockResolvedValue({ data: { items: [], total: 0 } });

    const { moveMultipleWallpapers } = useWallpaper();
    await moveMultipleWallpapers([11], ref(null), ref('5'));

    expect(apiMocks.moveWallpapers).toHaveBeenCalledWith([11], null);
    expect(apiMocks.getWallpapers).toHaveBeenCalledWith('5', 1, 20);
    expect(apiMocks.getActiveWallpaper).not.toHaveBeenCalled();
  });

  it('updates wallpaper data without refreshing an isolated list state', async () => {
    apiMocks.updateWallpaper.mockResolvedValue({
      data: { id: 9, name: 'cover' },
    });
    apiMocks.getWallpapers.mockResolvedValue({ data: { items: [], total: 0 } });

    const { updateWallpaper } = useWallpaper();
    const result = await updateWallpaper(9, { name: 'cover' });

    expect(apiMocks.updateWallpaper).toHaveBeenCalledWith(9, { name: 'cover' });
    expect(apiMocks.getWallpapers).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 9, name: 'cover' });
  });

  it('creates a group without refreshing groups in a transient caller', async () => {
    apiMocks.createGroup.mockResolvedValue({ data: { id: 3, name: 'travel' } });

    const { createGroup } = useWallpaper();
    const result = await createGroup({ name: 'travel' });

    expect(apiMocks.createGroup).toHaveBeenCalledWith({ name: 'travel' });
    expect(apiMocks.getGroups).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 3, name: 'travel' });
  });

  it('deletes a group without issuing a redundant groups refresh', async () => {
    apiMocks.deleteGroup.mockResolvedValue();

    const { deleteGroup } = useWallpaper();
    await deleteGroup(12);

    expect(apiMocks.deleteGroup).toHaveBeenCalledWith(12);
    expect(apiMocks.getGroups).not.toHaveBeenCalled();
  });
});

describe('useWallpaper - pagination setters & computed flags', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach(fn => fn.mockReset());
  });

  it('coerces pagination values with safe fallbacks', () => {
    const w = useWallpaper();

    w.setPage('3');
    expect(w.page.value).toBe(3);
    w.setPage(0);
    expect(w.page.value).toBe(1);
    w.setPage('abc');
    expect(w.page.value).toBe(1);

    w.setLimit('50');
    expect(w.limit.value).toBe(50);
    w.setLimit(0);
    expect(w.limit.value).toBe(20);
    w.setLimit('abc');
    expect(w.limit.value).toBe(20);
  });

  it('derives hasWallpapers/hasGroups from fetched data', async () => {
    apiMocks.getWallpapers.mockResolvedValue({
      data: { items: [{ id: 1 }], total: 1 },
    });
    apiMocks.getGroups.mockResolvedValue({ data: [] });

    const w = useWallpaper();
    expect(w.hasWallpapers.value).toBe(false);
    expect(w.hasGroups.value).toBe(false);

    await w.fetchWallpapers(null);
    expect(w.hasWallpapers.value).toBe(true);

    await w.fetchGroups();
    expect(w.hasGroups.value).toBe(false);

    apiMocks.getGroups.mockResolvedValue({ data: [{ id: 'g1' }] });
    await w.fetchGroups();
    expect(w.hasGroups.value).toBe(true);
  });

  it('uploads and refreshes the list for the resolved group', async () => {
    apiMocks.uploadWallpaper.mockResolvedValue({ data: { id: 1 } });
    apiMocks.getWallpapers.mockResolvedValue({ data: { items: [], total: 0 } });

    const w = useWallpaper();
    const got = await w.uploadWallpaper('file', ref('g3'), 'name');

    expect(apiMocks.uploadWallpaper).toHaveBeenCalledWith(
      'file',
      'g3',
      'name',
      undefined
    );
    expect(apiMocks.getWallpapers).toHaveBeenCalledWith('g3', 1, 20);
    expect(got).toEqual({ id: 1 });
  });
});

describe('useWallpaper - download & group helpers', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach(fn => fn.mockReset());
  });

  it('delegates downloads to the util and surfaces failures in error state', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    // jsdom 未实现 createObjectURL/revokeObjectURL，直接挂到全局 URL 上
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    try {
      apiMocks.downloadWallpapers.mockResolvedValue(
        new Blob(['z'], { type: 'image/jpeg' })
      );
      const w = useWallpaper();

      await w.downloadWallpapers([5]);

      expect(apiMocks.downloadWallpapers).toHaveBeenCalledWith([5]);
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
      expect(clickSpy).toHaveBeenCalledTimes(1);

      apiMocks.downloadWallpapers.mockRejectedValue(new Error('offline'));
      await expect(w.downloadWallpapers([6])).rejects.toThrow('offline');
      expect(w.error.value).toBe('offline');
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      clickSpy.mockRestore();
    }
  });

  it('applies a current group and mirrors the id into state', async () => {
    apiMocks.setCurrentGroup.mockResolvedValue({ data: true });
    const w = useWallpaper();

    const got = await w.applyCurrentGroup('g8');

    expect(apiMocks.setCurrentGroup).toHaveBeenCalledWith('g8');
    expect(got).toBe('g8');
    expect(w.currentGroup.value).toBe('g8');

    apiMocks.setCurrentGroup.mockRejectedValue(new Error('nope'));
    await expect(w.applyCurrentGroup('g9')).rejects.toThrow('nope');
    expect(w.error.value).toBe('nope');
    expect(w.currentGroup.value).toBe('g8');
  });

  it('propagates group deletion failures into the shared error state', async () => {
    apiMocks.deleteGroup.mockRejectedValue(new Error('forbidden'));
    const w = useWallpaper();

    await expect(w.deleteGroup('g1')).rejects.toThrow('forbidden');
    expect(w.error.value).toBe('forbidden');
  });
});

describe('useWallpaper - random & preload wiring', () => {
  const OriginalImage = global.Image;

  // 预加载通过 new Image() 等待图片解码，jsdom 的 Image 永不回调，替换为即时成功桩
  class MockImage {
    set src(value) {
      queueMicrotask(() => {
        if (this.onload) this.onload();
      });
    }
  }

  beforeEach(() => {
    Object.values(apiMocks).forEach(fn => fn.mockReset());
    global.Image = MockImage;
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  it('exposes the random pipeline over shared state', async () => {
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: null });

    const w = useWallpaper();
    const got = await w.randomWallpaper();

    expect(got).toBeNull();
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledWith(null);
    expect(w.error.value).toBeNull();
    expect(w.loading.value).toBe(false);
    // 空缓存时消费返回 null
    expect(w.consumePreloadedWallpaper()).toBeNull();
    expect(typeof w.ensurePreloaded).toBe('function');
  });

  it('serves a preloaded wallpaper without hitting the random endpoint', async () => {
    const cached = { id: 5, filePath: 'uploads/wall-5.jpg' };
    apiMocks.getRandomWallpaper
      .mockResolvedValueOnce({ data: cached })
      .mockResolvedValue({ data: null });
    // 源码假定 setActiveWallpaper 返回 Promise，给成功实现
    apiMocks.setActiveWallpaper.mockResolvedValue();

    const w = useWallpaper();
    await w.ensurePreloaded(1);

    apiMocks.getRandomWallpaper.mockClear();
    const got = await w.randomWallpaper();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(got).toEqual(cached);
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(2); // 仅补货请求
    expect(apiMocks.setActiveWallpaper).toHaveBeenCalledWith(5);
    expect(w.activeWallpaper.value).toEqual(cached);
  });
});

describe('useWallpaper - getWallpaperUrl formatting', () => {
  it('should handle different filePath formats without version params', () => {
    const { getWallpaperUrl } = useWallpaper();

    const cases = [
      {
        input: { filePath: 'uploads/test.jpg' },
        expected: '/uploads/test.jpg',
      },
      {
        input: { file_path: '/uploads/test.jpg' },
        expected: '/uploads/test.jpg',
      },
    ];

    cases.forEach(({ input, expected }) => {
      const url = getWallpaperUrl(input);
      // 文件名 UUID 不可变，URL 不携带 ?v= 版本参数，保证 immutable 缓存稳定命中
      expect(url).toContain(expected);
      expect(url).not.toMatch(/[?&]v=/);
    });
  });
});
