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
