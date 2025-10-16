import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/wallpaper.js', () => {
  return {
    wallpaperApi: {
      getWallpapers: vi.fn(),
      getWallpaper: vi.fn(),
      uploadWallpaper: vi.fn(),
      updateWallpaper: vi.fn(),
      deleteWallpaper: vi.fn(),
      deleteWallpapers: vi.fn(),
      moveWallpapers: vi.fn(),
      setActiveWallpaper: vi.fn(),
      getActiveWallpaper: vi.fn(),
      getRandomWallpaper: vi.fn(),
      getGroups: vi.fn(),
      getCurrentGroup: vi.fn(),
      setCurrentGroup: vi.fn(),
      createGroup: vi.fn(),
      updateGroup: vi.fn(),
      deleteGroup: vi.fn(),
    },
  };
});

vi.mock('@/constants/env.js', () => ({
  appEnv: {
    apiBase: 'http://localhost:3000/api',
  },
}));

// Import after mocking
import { useWallpaper } from '@/composables/useWallpaper.js';
import { wallpaperApi } from '@/api/wallpaper.js';

describe('useWallpaper - setActiveWallpaper', () => {
  let wallpaper;

  beforeEach(() => {
    vi.clearAllMocks();

    wallpaper = {
      id: 1,
      name: 'Test Wallpaper',
      filePath: 'uploads/wallpapers/test.jpg',
      file_path: 'uploads/wallpapers/test.jpg',
      updatedAt: '2025-10-16T10:00:00Z',
      updated_at: '2025-10-16T10:00:00Z',
      fileSize: 1024000,
      file_size: 1024000,
      createdAt: '2025-10-15T10:00:00Z',
      created_at: '2025-10-15T10:00:00Z',
    };
  });

  it('should set active wallpaper and fetch updated data', async () => {
    wallpaperApi.getWallpapers.mockResolvedValue({
      data: { items: [wallpaper], total: 1 },
    });
    wallpaperApi.getActiveWallpaper.mockResolvedValue({
      data: wallpaper,
    });

    const { setActiveWallpaper, activeWallpaper } = useWallpaper();

    await setActiveWallpaper(1);

    expect(wallpaperApi.setActiveWallpaper).toHaveBeenCalledWith(1);
    expect(wallpaperApi.getActiveWallpaper).toHaveBeenCalled();
    expect(activeWallpaper.value).toEqual(wallpaper);
  });

  it('should handle setActiveWallpaper error', async () => {
    wallpaperApi.setActiveWallpaper.mockRejectedValue(new Error('API Error'));

    const { setActiveWallpaper, error } = useWallpaper();

    try {
      await setActiveWallpaper(1);
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect(err.message).toBe('API Error');
      expect(error.value).toBe('API Error');
    }
  });

  it('should generate correct wallpaper URL with version parameter', () => {
    const { getWallpaperUrl } = useWallpaper();

    const url = getWallpaperUrl(wallpaper);

    expect(url).toContain('/uploads/wallpapers/test.jpg');
    expect(url).toContain('v=');
    // Should include timestamp version parameter
    const timestamp = new Date(wallpaper.updatedAt).getTime();
    expect(url).toContain(`v=${timestamp}`);
  });

  it('should generate wallpaper URL without version when specified', () => {
    const { getWallpaperUrl } = useWallpaper();

    const url = getWallpaperUrl(wallpaper, { addVersion: false });

    expect(url).toBe('/uploads/wallpapers/test.jpg');
    expect(url).not.toContain('v=');
  });

  it('should handle null wallpaper URL', () => {
    const { getWallpaperUrl } = useWallpaper();

    const url = getWallpaperUrl(null);

    expect(url).toBeNull();
  });

  it('should handle wallpaper with missing filePath', () => {
    const { getWallpaperUrl } = useWallpaper();

    const wallpaperWithoutPath = {
      id: 2,
      name: 'No Path Wallpaper',
    };

    const url = getWallpaperUrl(wallpaperWithoutPath);

    // When filePath is empty, it should return the API base path
    expect(url).toContain('api');
  });

  it('should fetch wallpapers', async () => {
    wallpaperApi.getWallpapers.mockResolvedValue({
      data: { items: [wallpaper], total: 1 },
    });

    const { fetchWallpapers, wallpapers } = useWallpaper();

    await fetchWallpapers(null, true);

    expect(wallpaperApi.getWallpapers).toHaveBeenCalled();
    expect(wallpapers.value).toEqual([wallpaper]);
  });

  it('should delete wallpaper and refresh active if deleted is active', async () => {
    wallpaperApi.getWallpapers.mockResolvedValue({
      data: { items: [], total: 0 },
    });
    wallpaperApi.getActiveWallpaper.mockResolvedValue({
      data: null,
    });

    const { deleteWallpaper, activeWallpaper } = useWallpaper();
    activeWallpaper.value = wallpaper;

    await deleteWallpaper(1, null);

    expect(wallpaperApi.deleteWallpaper).toHaveBeenCalledWith(1);
    expect(wallpaperApi.getActiveWallpaper).toHaveBeenCalled();
  });
});

describe('useWallpaper - getWallpaperUrl formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle different filePath formats', () => {
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
      const url = getWallpaperUrl(input, { addVersion: false });
      expect(url).toContain(expected);
    });
  });
});
