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
