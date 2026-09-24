import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createWallpaperQuery } from '@/composables/wallpaper/useWallpaperQuery.js';

const apiMocks = vi.hoisted(() => ({
  getWallpapers: vi.fn(),
  getGroups: vi.fn(),
  getCurrentGroup: vi.fn(),
  getActiveWallpaper: vi.fn(),
}));

vi.mock('@/api/wallpaper.js', () => ({
  wallpaperApi: apiMocks,
}));

const wallpaper = id => ({ id, filePath: `uploads/wall-${id}.jpg` });

function createQuery() {
  const state = {
    wallpapers: ref([]),
    groups: ref([]),
    currentGroup: ref(null),
    activeWallpaper: ref(null),
    loading: ref(false),
    error: ref(null),
    page: ref(1),
    limit: ref(20),
    total: ref(0),
  };
  return { ...state, ...createWallpaperQuery(state) };
}

beforeEach(() => {
  Object.values(apiMocks).forEach(fn => fn.mockReset());
});

describe('fetchWallpapers', () => {
  it('loads paged items into state and reports the total', async () => {
    apiMocks.getWallpapers.mockResolvedValue({
      data: { items: [wallpaper(1), wallpaper(2)], total: 27 },
    });
    const q = createQuery();

    const pending = q.fetchWallpapers('g1');
    expect(q.loading.value).toBe(true);
    await pending;

    expect(apiMocks.getWallpapers).toHaveBeenCalledWith('g1', 1, 20);
    expect(q.wallpapers.value).toEqual([wallpaper(1), wallpaper(2)]);
    expect(q.total.value).toBe(27);
    expect(q.loading.value).toBe(false);
    expect(q.error.value).toBeNull();
  });

  it('unwraps refs for the group id and respects current paging state', async () => {
    apiMocks.getWallpapers.mockResolvedValue({ data: { items: [], total: 0 } });
    const q = createQuery();
    q.page.value = 3;
    q.limit.value = 50;

    await q.fetchWallpapers(ref('g2'));

    expect(apiMocks.getWallpapers).toHaveBeenCalledWith('g2', 3, 50);
  });

  it('loads the full list when paging is disabled', async () => {
    apiMocks.getWallpapers.mockResolvedValue({
      data: [wallpaper(1), wallpaper(2), wallpaper(3)],
    });
    const q = createQuery();

    await q.fetchWallpapers(null, false);

    expect(apiMocks.getWallpapers).toHaveBeenCalledWith(null, null, null);
    expect(q.wallpapers.value).toHaveLength(3);
    expect(q.total.value).toBe(3);
  });

  it('accepts wrapped payloads when paging is disabled', async () => {
    apiMocks.getWallpapers.mockResolvedValue({
      data: { items: [wallpaper(9)] },
    });
    const q = createQuery();

    await q.fetchWallpapers(null, false);

    expect(q.wallpapers.value).toEqual([wallpaper(9)]);
    expect(q.total.value).toBe(1);
  });

  it('falls back to an empty list when the payload is unusable', async () => {
    const q = createQuery();

    apiMocks.getWallpapers.mockResolvedValue({ data: null });
    await q.fetchWallpapers('g1');
    expect(q.wallpapers.value).toEqual([]);
    expect(q.total.value).toBe(0);

    apiMocks.getWallpapers.mockResolvedValue({ data: null });
    await q.fetchWallpapers('g1', false);
    expect(q.wallpapers.value).toEqual([]);
    expect(q.total.value).toBe(0);
  });

  it('captures the error message and stops loading on failure', async () => {
    apiMocks.getWallpapers.mockRejectedValue(new Error('net down'));
    const q = createQuery();

    await q.fetchWallpapers('g1');

    expect(q.error.value).toBe('net down');
    expect(q.loading.value).toBe(false);

    // 非 Error 抛出物走兜底文案
    apiMocks.getWallpapers.mockRejectedValue({});
    await q.fetchWallpapers('g1');
    expect(q.error.value).toBe('获取壁纸失败');
    expect(q.loading.value).toBe(false);
  });
});

describe('fetchGroups', () => {
  it('accepts array and wrapped group payloads', async () => {
    const q = createQuery();

    apiMocks.getGroups.mockResolvedValue({ data: [{ id: 'g1' }] });
    await q.fetchGroups();
    expect(q.groups.value).toEqual([{ id: 'g1' }]);

    apiMocks.getGroups.mockResolvedValue({
      data: { items: [{ id: 'g2' }, { id: 'g3' }] },
    });
    await q.fetchGroups();
    expect(q.groups.value).toEqual([{ id: 'g2' }, { id: 'g3' }]);

    apiMocks.getGroups.mockResolvedValue({ data: null });
    await q.fetchGroups();
    expect(q.groups.value).toEqual([]);
  });

  it('records the error message on failure', async () => {
    apiMocks.getGroups.mockRejectedValue(new Error('groups offline'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const q = createQuery();

    await q.fetchGroups();

    expect(q.error.value).toBe('groups offline');
    errorSpy.mockRestore();
  });
});

describe('fetchCurrentGroup', () => {
  it('stores and returns the current group', async () => {
    apiMocks.getCurrentGroup.mockResolvedValue({ data: { id: 'g1' } });
    const q = createQuery();

    const got = await q.fetchCurrentGroup();

    expect(q.currentGroup.value).toEqual({ id: 'g1' });
    expect(got).toEqual({ id: 'g1' });
  });

  it('resets to null when the payload is empty', async () => {
    apiMocks.getCurrentGroup.mockResolvedValue({ data: null });
    const q = createQuery();
    q.currentGroup.value = { id: 'g0' };

    const got = await q.fetchCurrentGroup();

    expect(q.currentGroup.value).toBeNull();
    expect(got).toBeNull();
  });

  it('silently falls back to null on failure without touching error state', async () => {
    apiMocks.getCurrentGroup.mockRejectedValue(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const q = createQuery();

    await q.fetchCurrentGroup();

    // 失败路径不返回值，仅把状态重置为 null
    expect(q.currentGroup.value).toBeNull();
    expect(q.error.value).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('fetchActiveWallpaper', () => {
  it('stores the active wallpaper', async () => {
    apiMocks.getActiveWallpaper.mockResolvedValue({ data: wallpaper(7) });
    const q = createQuery();

    await q.fetchActiveWallpaper();

    expect(q.activeWallpaper.value).toEqual(wallpaper(7));
  });

  it('resets to null on failure without touching error state', async () => {
    apiMocks.getActiveWallpaper.mockRejectedValue(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const q = createQuery();
    q.activeWallpaper.value = wallpaper(1);

    await q.fetchActiveWallpaper();

    expect(q.activeWallpaper.value).toBeNull();
    expect(q.error.value).toBeNull();
    warnSpy.mockRestore();
  });
});
