import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { render, waitFor } from '@testing-library/vue';
import WallpaperBackground from '@/components/wallpaper/WallpaperBackground.vue';

const OriginalImage = global.Image;

const getWallpaperUrlMock = vi.fn();
const fetchActiveWallpaperMock = vi.fn();
const activeWallpaperRef = ref(null);

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

  it('renders the default gradient until the wallpaper image resolves', async () => {
    const { container } = render(WallpaperBackground, {
      props: { wallpaper: { id: 1, filePath: 'uploads/wall.jpg' } },
    });

    expect(container.querySelector('.default-background')).toBeTruthy();
    expect(container.querySelector('.user-wallpaper')).toBeNull();

    await waitFor(() =>
      expect(container.querySelector('.user-wallpaper')).toBeTruthy()
    );

    expect(
      container.querySelector('.user-wallpaper').style.backgroundImage
    ).toContain(stableUrl);
  });

  it('fetches the active wallpaper on mount and adopts it when no prop is given', async () => {
    render(WallpaperBackground);

    expect(fetchActiveWallpaperMock).toHaveBeenCalledTimes(1);

    activeWallpaperRef.value = { id: 2, filePath: 'uploads/active.jpg' };

    await waitFor(() => expect(srcSetSpy).toHaveBeenCalled());

    expect(getWallpaperUrlMock).toHaveBeenCalledWith(activeWallpaperRef.value);
    expect(srcSetSpy).toHaveBeenCalledWith(stableUrl);
  });

  it('stays on the default background when the wallpaper resolves no url', async () => {
    getWallpaperUrlMock.mockReturnValue(null);

    const { container } = render(WallpaperBackground, {
      props: { wallpaper: { id: 1, filePath: 'uploads/wall.jpg' } },
    });
    await nextTick();

    expect(srcSetSpy).not.toHaveBeenCalled();
    expect(container.querySelector('.default-background')).toBeTruthy();
    expect(container.querySelector('.user-wallpaper')).toBeNull();
  });
});

describe('WallpaperBackground - load failure fallback', () => {
  const stableUrl = 'https://example.com/uploads/wall.jpg?v=12345';
  let srcSetSpy;

  beforeEach(() => {
    srcSetSpy = vi.fn();

    // 始终加载失败的 Image 桩：验证重试与最终回退
    class FailingImage {
      constructor() {
        this._src = '';
        this.onload = null;
        this.onerror = null;
      }

      set src(value) {
        this._src = value;
        srcSetSpy(value);
        queueMicrotask(() => {
          if (this.onerror) this.onerror();
        });
      }

      get src() {
        return this._src;
      }
    }

    global.Image = FailingImage;
    getWallpaperUrlMock.mockReset();
    getWallpaperUrlMock.mockReturnValue(stableUrl);
    fetchActiveWallpaperMock.mockReset();
    activeWallpaperRef.value = null;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  it('retries with backoff and falls back to the default background', async () => {
    const { container } = render(WallpaperBackground, {
      props: { wallpaper: { id: 1, filePath: 'uploads/wall.jpg' } },
    });

    await vi.advanceTimersByTimeAsync(0); // 首次加载失败
    await vi.advanceTimersByTimeAsync(1000); // 第 1 次重试
    await vi.advanceTimersByTimeAsync(2000); // 第 2 次重试
    await vi.advanceTimersByTimeAsync(3000); // 第 3 次重试后放弃

    expect(srcSetSpy).toHaveBeenCalledTimes(4);
    expect(srcSetSpy.mock.calls[0][0]).toBe(stableUrl);
    expect(srcSetSpy.mock.calls[1][0]).toContain('_retry=1_');
    expect(srcSetSpy.mock.calls[2][0]).toContain('_retry=2_');
    expect(srcSetSpy.mock.calls[3][0]).toContain('_retry=3_');
    expect(container.querySelector('.default-background')).toBeTruthy();
    expect(container.querySelector('.user-wallpaper')).toBeNull();
  });
});
