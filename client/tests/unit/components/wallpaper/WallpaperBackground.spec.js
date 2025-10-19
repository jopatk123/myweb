import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/vue';
import WallpaperBackground from '@/components/wallpaper/WallpaperBackground.vue';

const OriginalImage = global.Image;

const { getWallpaperUrlMock, fetchActiveWallpaperMock, activeWallpaperRef } =
  vi.hoisted(() => {
    const { ref } = require('vue');
    return {
      getWallpaperUrlMock: vi.fn(),
      fetchActiveWallpaperMock: vi.fn(),
      activeWallpaperRef: ref(null),
    };
  });

vi.mock('@/composables/useWallpaper.js', () => ({
  __esModule: true,
  useWallpaper: () => ({
    activeWallpaper: activeWallpaperRef,
    fetchActiveWallpaper: fetchActiveWallpaperMock,
    getWallpaperUrl: getWallpaperUrlMock,
  }),
}));

describe('WallpaperBackground', () => {
  const stableUrl = 'https://example.com/uploads/wall.jpg?v=12345';
  let srcSetSpy;

  beforeEach(() => {
    srcSetSpy = vi.fn();

    class MockImage {
      constructor() {
        this._src = '';
        this.onload = null;
        this.onerror = null;
      }

      set src(value) {
        this._src = value;
        srcSetSpy(value);
        queueMicrotask(() => {
          if (this.onload) {
            this.onload();
          }
        });
      }

      get src() {
        return this._src;
      }
    }

    global.Image = MockImage;
    getWallpaperUrlMock.mockReset();
    getWallpaperUrlMock.mockReturnValue(stableUrl);
    fetchActiveWallpaperMock.mockReset();
    activeWallpaperRef.value = null;
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  it('preloads wallpaper without unnecessary cache-busting parameters', async () => {
    const wallpaper = {
      id: 1,
      filePath: 'uploads/wall.jpg',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(WallpaperBackground, {
      props: {
        wallpaper,
      },
    });

    await waitFor(() => expect(srcSetSpy).toHaveBeenCalled());

    expect(srcSetSpy).toHaveBeenCalledTimes(1);
    expect(srcSetSpy).toHaveBeenCalledWith(stableUrl);
    expect(fetchActiveWallpaperMock).not.toHaveBeenCalled();
  });
});
