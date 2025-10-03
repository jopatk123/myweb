const apiMocks = vi.hoisted(() => {
  const methods = [
    'getWallpapers',
    'deleteWallpaper',
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
});
