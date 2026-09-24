import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWallpaperUrl,
  downloadWallpapers,
} from '@/composables/wallpaper/wallpaperUrl.js';

const apiMocks = vi.hoisted(() => ({
  downloadWallpapers: vi.fn(),
}));

vi.mock('@/api/wallpaper.js', () => ({
  wallpaperApi: apiMocks,
}));

// appEnv 为可变对象，便于在各用例中切换 apiBase（getWallpaperUrl 每次调用时读取）
const envMock = vi.hoisted(() => ({
  appEnv: { apiBase: 'http://api.test/base/' },
}));

vi.mock('@/constants/env.js', () => envMock);

describe('getWallpaperUrl', () => {
  beforeEach(() => {
    envMock.appEnv.apiBase = 'http://api.test/base/';
  });

  it('returns null for falsy wallpaper input', () => {
    expect(getWallpaperUrl(null)).toBeNull();
    expect(getWallpaperUrl(undefined)).toBeNull();
  });

  it('maps uploads/ relative paths to the site root, bypassing apiBase', () => {
    expect(getWallpaperUrl({ filePath: 'uploads/a.jpg' })).toBe(
      '/uploads/a.jpg'
    );
    expect(getWallpaperUrl({ file_path: 'uploads/b.png' })).toBe(
      '/uploads/b.png'
    );
  });

  it('falls back to the snake_case file_path field', () => {
    expect(getWallpaperUrl({ file_path: 'store/c.png' })).toBe(
      'http://api.test/base/store/c.png'
    );
  });

  it('joins apiBase and strips redundant leading slashes', () => {
    envMock.appEnv.apiBase = 'http://api.test/base//';
    expect(getWallpaperUrl({ filePath: '/x/y.png' })).toBe(
      'http://api.test/base/x/y.png'
    );
  });

  it('keeps the path when apiBase already points at the resource root', () => {
    expect(getWallpaperUrl({ filePath: 'x/y.png' })).toBe(
      'http://api.test/base/x/y.png'
    );
  });

  it('returns a root-relative url when apiBase is empty', () => {
    envMock.appEnv.apiBase = '';
    expect(getWallpaperUrl({ filePath: '/x/y.png' })).toBe('/x/y.png');
  });

  it('treats a missing filePath as the apiBase root', () => {
    expect(getWallpaperUrl({})).toBe('http://api.test/base/');
  });

  it('never appends cache-busting version params', () => {
    const url = getWallpaperUrl({
      filePath: 'uploads/wall.jpg',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    expect(url).toBe('/uploads/wall.jpg');
    expect(url).not.toMatch(/[?&]v=/);
  });
});

describe('downloadWallpapers', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let clickSpy;
  let appendSpy;

  const appendedLinks = () =>
    appendSpy.mock.calls
      .map(call => call[0])
      .filter(node => node.tagName === 'A');

  beforeEach(() => {
    // jsdom 未实现 URL.createObjectURL/revokeObjectURL，直接挂到全局 URL 上
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    appendSpy = vi.spyOn(document.body, 'appendChild');
    apiMocks.downloadWallpapers.mockReset();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('downloads a single wallpaper named by id and mime extension', async () => {
    const blob = new Blob(['bytes'], { type: 'image/jpeg' });
    apiMocks.downloadWallpapers.mockResolvedValue(blob);

    await expect(downloadWallpapers([5])).resolves.toBe(true);

    expect(apiMocks.downloadWallpapers).toHaveBeenCalledWith([5]);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(appendedLinks()).toHaveLength(1);
    expect(appendedLinks()[0].download).toBe('wallpaper_5.jpg');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    // 下载用锚点用完即删，不在 DOM 中残留
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });

  it('zips multiple wallpapers into a timestamped archive name', async () => {
    apiMocks.downloadWallpapers.mockResolvedValue(
      new Blob(['zip'], { type: 'application/zip' })
    );

    await downloadWallpapers([1, 2, 3]);

    expect(appendedLinks()[0].download).toMatch(/^wallpapers_\d+\.zip$/);
  });

  it('maps known mime types and falls back to .bin for unknown ones', async () => {
    apiMocks.downloadWallpapers.mockResolvedValue(
      new Blob(['x'], { type: 'image/webp' })
    );
    await downloadWallpapers([7]);
    expect(appendedLinks()[0].download).toBe('wallpaper_7.webp');

    appendSpy.mockClear();
    apiMocks.downloadWallpapers.mockResolvedValue(
      new Blob(['x'], { type: 'application/x-zip-compressed' })
    );
    await downloadWallpapers([8]);
    expect(appendedLinks()[0].download).toBe('wallpaper_8.zip');

    appendSpy.mockClear();
    apiMocks.downloadWallpapers.mockResolvedValue(
      new Blob(['x'], { type: 'image/avif' })
    );
    await downloadWallpapers([9]);
    expect(appendedLinks()[0].download).toBe('wallpaper_9.bin');
  });

  it('propagates api failures without creating or clicking a link', async () => {
    apiMocks.downloadWallpapers.mockRejectedValue(new Error('boom'));

    await expect(downloadWallpapers([1])).rejects.toThrow('boom');

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(appendedLinks()).toHaveLength(0);
  });
});
