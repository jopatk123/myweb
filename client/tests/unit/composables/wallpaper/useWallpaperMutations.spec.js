import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createWallpaperMutations } from '@/composables/wallpaper/useWallpaperMutations.js';

const apiMocks = vi.hoisted(() => ({
  uploadWallpaper: vi.fn(),
  deleteWallpaper: vi.fn(),
  updateWallpaper: vi.fn(),
  createGroup: vi.fn(),
  deleteGroup: vi.fn(),
  deleteWallpapers: vi.fn(),
  moveWallpapers: vi.fn(),
  setCurrentGroup: vi.fn(),
}));

vi.mock('@/api/wallpaper.js', () => ({
  wallpaperApi: apiMocks,
}));

function createMutations() {
  const state = {
    activeWallpaper: ref(null),
    currentGroup: ref(null),
    loading: ref(false),
    error: ref(null),
    fetchWallpapers: vi.fn().mockResolvedValue(),
    fetchActiveWallpaper: vi.fn().mockResolvedValue(),
  };
  return { ...state, ...createWallpaperMutations(state) };
}

beforeEach(() => {
  Object.values(apiMocks).forEach(fn => fn.mockReset());
});

describe('uploadWallpaper', () => {
  it('uploads with the resolved group and refreshes the list', async () => {
    apiMocks.uploadWallpaper.mockResolvedValue({ data: { id: 1 } });
    const m = createMutations();
    const onProgress = vi.fn();

    const got = await m.uploadWallpaper('file', ref('g3'), 'name', onProgress);

    expect(apiMocks.uploadWallpaper).toHaveBeenCalledWith(
      'file',
      'g3',
      'name',
      onProgress
    );
    expect(m.fetchWallpapers).toHaveBeenCalledWith('g3');
    expect(got).toEqual({ id: 1 });
    expect(m.loading.value).toBe(false);
    expect(m.error.value).toBeNull();
  });

  it('records the error, rethrows and skips the refresh on failure', async () => {
    apiMocks.uploadWallpaper.mockRejectedValue(new Error('too large'));
    const m = createMutations();

    await expect(m.uploadWallpaper('file', ref('g3'), 'name')).rejects.toThrow(
      'too large'
    );

    expect(m.error.value).toBe('too large');
    expect(m.fetchWallpapers).not.toHaveBeenCalled();
    expect(m.loading.value).toBe(false);
  });
});

describe('deleteWallpaper', () => {
  it('refreshes the list and re-fetches the active wallpaper when it was deleted', async () => {
    apiMocks.deleteWallpaper.mockResolvedValue();
    const m = createMutations();
    m.activeWallpaper.value = { id: 42 };

    await m.deleteWallpaper(42, ref('g1'));

    expect(apiMocks.deleteWallpaper).toHaveBeenCalledWith(42);
    expect(m.fetchWallpapers).toHaveBeenCalledWith('g1');
    expect(m.fetchActiveWallpaper).toHaveBeenCalledTimes(1);
  });

  it('keeps the active wallpaper untouched when another one was deleted', async () => {
    apiMocks.deleteWallpaper.mockResolvedValue();
    const m = createMutations();
    m.activeWallpaper.value = { id: 42 };

    await m.deleteWallpaper(43, ref('g1'));

    expect(m.fetchActiveWallpaper).not.toHaveBeenCalled();
  });

  it('records the error and rethrows on failure', async () => {
    apiMocks.deleteWallpaper.mockRejectedValue(new Error('forbidden'));
    const m = createMutations();

    await expect(m.deleteWallpaper(1)).rejects.toThrow('forbidden');
    expect(m.error.value).toBe('forbidden');
  });
});

describe('updateWallpaper', () => {
  it('returns the unwrapped payload without touching the list', async () => {
    apiMocks.updateWallpaper.mockResolvedValue({
      data: { id: 9, name: 'cover' },
    });
    const m = createMutations();

    const got = await m.updateWallpaper(9, { name: 'cover' });

    expect(apiMocks.updateWallpaper).toHaveBeenCalledWith(9, {
      name: 'cover',
    });
    expect(m.fetchWallpapers).not.toHaveBeenCalled();
    expect(got).toEqual({ id: 9, name: 'cover' });
  });

  it('records the error and rethrows on failure', async () => {
    apiMocks.updateWallpaper.mockRejectedValue(new Error('dup name'));
    const m = createMutations();

    await expect(m.updateWallpaper(9, {})).rejects.toThrow('dup name');
    expect(m.error.value).toBe('dup name');
  });
});

describe('createGroup', () => {
  it('returns the raw response data on success', async () => {
    apiMocks.createGroup.mockResolvedValue({ data: { id: 3, name: 'travel' } });
    const m = createMutations();

    const got = await m.createGroup({ name: 'travel' });

    expect(apiMocks.createGroup).toHaveBeenCalledWith({ name: 'travel' });
    expect(got).toEqual({ id: 3, name: 'travel' });
    expect(m.error.value).toBeNull();
  });

  it('records the error and rethrows on failure', async () => {
    apiMocks.createGroup.mockRejectedValue(new Error('duplicate'));
    const m = createMutations();

    await expect(m.createGroup({ name: 'x' })).rejects.toThrow('duplicate');
    expect(m.error.value).toBe('duplicate');
  });
});

describe('deleteGroup', () => {
  it('delegates to the api without extra refreshes', async () => {
    apiMocks.deleteGroup.mockResolvedValue();
    const m = createMutations();

    await m.deleteGroup(12);

    expect(apiMocks.deleteGroup).toHaveBeenCalledWith(12);
    expect(m.fetchWallpapers).not.toHaveBeenCalled();
    expect(m.error.value).toBeNull();
  });

  it('records the error and rethrows on failure', async () => {
    apiMocks.deleteGroup.mockRejectedValue(new Error('not empty'));
    const m = createMutations();

    await expect(m.deleteGroup(12)).rejects.toThrow('not empty');
    expect(m.error.value).toBe('not empty');
  });
});

describe('deleteMultipleWallpapers', () => {
  it('refreshes the list and re-fetches the active wallpaper when it was removed', async () => {
    apiMocks.deleteWallpapers.mockResolvedValue();
    const m = createMutations();
    m.activeWallpaper.value = { id: '5' };

    // id 同时覆盖数字/字符串形态，验证 Number 归一化比较
    await m.deleteMultipleWallpapers([6, '5'], ref(9));

    expect(apiMocks.deleteWallpapers).toHaveBeenCalledWith([6, '5']);
    expect(m.fetchWallpapers).toHaveBeenCalledWith(9);
    expect(m.fetchActiveWallpaper).toHaveBeenCalledTimes(1);
  });

  it('does not re-fetch the active wallpaper when it survived', async () => {
    apiMocks.deleteWallpapers.mockResolvedValue();
    const m = createMutations();
    m.activeWallpaper.value = { id: 5 };

    await m.deleteMultipleWallpapers([1, 2], ref(9));

    expect(m.fetchActiveWallpaper).not.toHaveBeenCalled();
  });

  it('does not re-fetch anything when there is no active wallpaper', async () => {
    apiMocks.deleteWallpapers.mockResolvedValue();
    const m = createMutations();

    await m.deleteMultipleWallpapers([1, 2], ref(9));

    expect(m.fetchActiveWallpaper).not.toHaveBeenCalled();
    expect(m.fetchWallpapers).toHaveBeenCalledWith(9);
  });

  it('records the error and rethrows on failure', async () => {
    apiMocks.deleteWallpapers.mockRejectedValue(new Error('partial fail'));
    const m = createMutations();

    await expect(m.deleteMultipleWallpapers([1], ref(9))).rejects.toThrow(
      'partial fail'
    );
    expect(m.error.value).toBe('partial fail');
    expect(m.fetchWallpapers).not.toHaveBeenCalled();
  });
});

describe('moveMultipleWallpapers', () => {
  it('moves to the resolved target group and refreshes the source view', async () => {
    apiMocks.moveWallpapers.mockResolvedValue();
    const m = createMutations();

    await m.moveMultipleWallpapers([11], ref(null), ref('5'));

    expect(apiMocks.moveWallpapers).toHaveBeenCalledWith([11], null);
    expect(m.fetchWallpapers).toHaveBeenCalledWith('5');
  });

  it('records the error and rethrows on failure', async () => {
    apiMocks.moveWallpapers.mockRejectedValue(new Error('move denied'));
    const m = createMutations();

    await expect(m.moveMultipleWallpapers([11], 'g2', 'g1')).rejects.toThrow(
      'move denied'
    );
    expect(m.error.value).toBe('move denied');
    expect(m.fetchWallpapers).not.toHaveBeenCalled();
  });
});

describe('applyCurrentGroup', () => {
  it('persists the selection and mirrors it into state', async () => {
    apiMocks.setCurrentGroup.mockResolvedValue();
    const m = createMutations();

    const got = await m.applyCurrentGroup('g8');

    expect(apiMocks.setCurrentGroup).toHaveBeenCalledWith('g8');
    expect(got).toBe('g8');
    expect(m.currentGroup.value).toBe('g8');
  });

  it('leaves the current group unchanged on failure', async () => {
    apiMocks.setCurrentGroup.mockRejectedValue(new Error('nope'));
    const m = createMutations();
    m.currentGroup.value = 'g0';

    await expect(m.applyCurrentGroup('g8')).rejects.toThrow('nope');

    expect(m.error.value).toBe('nope');
    expect(m.currentGroup.value).toBe('g0');
  });
});
