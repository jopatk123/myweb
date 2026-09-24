import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { createWallpaperRandom } from '@/composables/wallpaper/useWallpaperRandom.js';

const apiMocks = vi.hoisted(() => ({
  getRandomWallpaper: vi.fn(),
  setActiveWallpaper: vi.fn(),
}));

vi.mock('@/api/wallpaper.js', () => ({
  wallpaperApi: apiMocks,
}));

const OriginalImage = global.Image;
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

let imageShouldFail = false;

// useWallpaperRandom 通过 new Image() 预加载图片，jsdom 的 Image 永不回调，
// 这里替换成可控桩：默认成功，imageShouldFail 控制失败路径
class MockImage {
  constructor() {
    this._src = '';
    this.onload = null;
    this.onerror = null;
  }

  set src(value) {
    this._src = value;
    queueMicrotask(() => {
      if (imageShouldFail) {
        if (this.onerror) this.onerror();
      } else if (this.onload) {
        this.onload();
      }
    });
  }

  get src() {
    return this._src;
  }
}

const buildWallpaper = id => ({ id, filePath: `uploads/wall-${id}.jpg` });

function createInstance(currentGroup = ref(null)) {
  const loading = ref(false);
  const error = ref(null);
  const activeWallpaper = ref(null);
  const random = createWallpaperRandom({
    currentGroup,
    loading,
    error,
    activeWallpaper,
  });
  return { loading, error, activeWallpaper, currentGroup, ...random };
}

beforeEach(() => {
  imageShouldFail = false;
  global.Image = MockImage;
  apiMocks.getRandomWallpaper.mockReset();
  apiMocks.setActiveWallpaper.mockReset();
  // 源码假定 setActiveWallpaper 返回 Promise，默认给成功实现
  apiMocks.setActiveWallpaper.mockResolvedValue();
});

afterEach(() => {
  global.Image = OriginalImage;
});

describe('ensurePreloaded', () => {
  it('fetches and caches the requested number of wallpapers for a group key', async () => {
    apiMocks.getRandomWallpaper
      .mockResolvedValueOnce({ data: buildWallpaper(1) })
      .mockResolvedValueOnce({ data: buildWallpaper(2) });

    const inst = createInstance();
    await inst.ensurePreloaded(2, 'g1');

    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(2);
    apiMocks.getRandomWallpaper.mock.calls.forEach(call =>
      expect(call[0]).toBe('g1')
    );
    expect(inst.preloadedWallpapers.value).toEqual([
      { groupKey: 'g1', wallpaper: buildWallpaper(1) },
      { groupKey: 'g1', wallpaper: buildWallpaper(2) },
    ]);
    expect(inst.isPreloading.value).toBe(false);
  });

  it('derives the group key from currentGroup when groupId is omitted', async () => {
    apiMocks.getRandomWallpaper.mockResolvedValue({
      data: buildWallpaper(3),
    });

    const withObject = createInstance(ref({ id: 'g9', name: 'x' }));
    await withObject.ensurePreloaded(1);
    expect(apiMocks.getRandomWallpaper).toHaveBeenLastCalledWith('g9');

    const withString = createInstance(ref('g7'));
    await withString.ensurePreloaded(1);
    expect(apiMocks.getRandomWallpaper).toHaveBeenLastCalledWith('g7');

    const withoutGroup = createInstance();
    await withoutGroup.ensurePreloaded(1);
    expect(apiMocks.getRandomWallpaper).toHaveBeenLastCalledWith(null);
  });

  it('skips the fetch when the cache already covers the count', async () => {
    apiMocks.getRandomWallpaper.mockResolvedValue({
      data: buildWallpaper(1),
    });

    const inst = createInstance();
    await inst.ensurePreloaded(1, 'g1');
    await inst.ensurePreloaded(1, 'g1');
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(1);

    // 换了分组后缓存不命中，需要重新拉取
    await inst.ensurePreloaded(1, 'g2');
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(2);
    expect(apiMocks.getRandomWallpaper).toHaveBeenLastCalledWith('g2');
  });

  it('guards against concurrent preload runs', async () => {
    const gates = [];
    apiMocks.getRandomWallpaper.mockImplementation(
      () => new Promise(resolve => gates.push(resolve))
    );

    const inst = createInstance();
    inst.ensurePreloaded(2, 'g1');
    await flushPromises();
    expect(inst.isPreloading.value).toBe(true);

    const second = inst.ensurePreloaded(2, 'g1');
    expect(await second).toBeUndefined();
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(1);

    gates.shift()({ data: buildWallpaper(1) });
    await flushPromises();
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(2);
    gates.shift()({ data: buildWallpaper(2) });
    await flushPromises();

    expect(inst.preloadedWallpapers.value).toHaveLength(2);
    expect(inst.isPreloading.value).toBe(false);
  });

  it('still caches the wallpaper when the image preload fails', async () => {
    imageShouldFail = true;
    apiMocks.getRandomWallpaper.mockResolvedValue({
      data: buildWallpaper(4),
    });

    const inst = createInstance();
    await inst.ensurePreloaded(1, 'g1');

    expect(inst.preloadedWallpapers.value).toEqual([
      { groupKey: 'g1', wallpaper: buildWallpaper(4) },
    ]);
  });

  it('warns per failed fetch but keeps the remaining queue working', async () => {
    apiMocks.getRandomWallpaper
      .mockResolvedValueOnce({ data: buildWallpaper(1) })
      .mockRejectedValueOnce(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const inst = createInstance();
    await inst.ensurePreloaded(2, 'g1');

    expect(warnSpy).toHaveBeenCalled();
    expect(inst.preloadedWallpapers.value).toHaveLength(1);
    expect(inst.isPreloading.value).toBe(false);
  });

  it('skips payloads that unwrap to nothing', async () => {
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: null });

    const inst = createInstance();
    await inst.ensurePreloaded(2, 'g1');

    expect(inst.preloadedWallpapers.value).toHaveLength(0);
    expect(inst.isPreloading.value).toBe(false);
  });
});

describe('consumePreloadedWallpaper', () => {
  it('returns null when the cache has no entry for the group', () => {
    const inst = createInstance();
    expect(inst.consumePreloadedWallpaper('g1')).toBeNull();
  });

  it('returns and removes the first cached wallpaper of the group', async () => {
    apiMocks.getRandomWallpaper
      .mockResolvedValueOnce({ data: buildWallpaper(1) })
      .mockResolvedValueOnce({ data: buildWallpaper(2) });

    const inst = createInstance();
    await inst.ensurePreloaded(2, 'g1');

    expect(inst.consumePreloadedWallpaper('nope')).toBeNull();
    expect(inst.consumePreloadedWallpaper('g1')).toEqual(buildWallpaper(1));
    expect(inst.preloadedWallpapers.value).toHaveLength(1);
    // 默认 key 取自 currentGroup(null)，与已缓存分组不匹配
    expect(inst.consumePreloadedWallpaper()).toBeNull();
  });
});

describe('randomWallpaper', () => {
  it('serves the cached wallpaper first and replenishes the queue', async () => {
    const cached = buildWallpaper(5);
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: cached });

    const inst = createInstance();
    await inst.ensurePreloaded(1);

    // 清空调用记录；补货请求返回空数据，避免再次写入缓存干扰断言
    apiMocks.getRandomWallpaper.mockClear();
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: null });

    const got = await inst.randomWallpaper();
    await flushPromises();

    expect(got).toEqual(cached);
    expect(inst.preloadedWallpapers.value).toHaveLength(0);
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(2);
    apiMocks.getRandomWallpaper.mock.calls.forEach(call =>
      expect(call[0]).toBe(null)
    );
    expect(apiMocks.setActiveWallpaper).toHaveBeenCalledWith(5);
    expect(inst.activeWallpaper.value).toEqual(cached);
    expect(inst.loading.value).toBe(false);
  });

  it('fetches, preloads the image and activates when the cache is empty', async () => {
    const image = buildWallpaper(8);
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: image });

    const inst = createInstance();
    const got = await inst.randomWallpaper('g2');
    await flushPromises();

    expect(got).toEqual(image);
    expect(apiMocks.getRandomWallpaper).toHaveBeenNthCalledWith(1, 'g2');
    // 1 次随机 + 2 次后台补货
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(3);
    expect(apiMocks.setActiveWallpaper).toHaveBeenCalledWith(8);
    expect(inst.activeWallpaper.value).toEqual(image);
    expect(inst.loading.value).toBe(false);
    expect(inst.error.value).toBeNull();
  });

  it('returns nothing when a load is already running', async () => {
    const inst = createInstance();
    inst.loading.value = true;

    const got = await inst.randomWallpaper();

    expect(got).toBeNull();
    expect(apiMocks.getRandomWallpaper).not.toHaveBeenCalled();
    expect(inst.loading.value).toBe(true);
  });

  it('records the error and resets loading when the api fails', async () => {
    apiMocks.getRandomWallpaper.mockRejectedValue(new Error('boom'));

    const inst = createInstance();
    const got = await inst.randomWallpaper();

    expect(got).toBeNull();
    expect(inst.error.value).toBe('boom');
    expect(inst.loading.value).toBe(false);
  });

  it('skips activation when the payload unwraps to nothing', async () => {
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: null });

    const inst = createInstance();
    const got = await inst.randomWallpaper();

    expect(got).toBeNull();
    expect(apiMocks.setActiveWallpaper).not.toHaveBeenCalled();
    expect(inst.error.value).toBeNull();
  });

  it('skips activation when the payload has no id', async () => {
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: {} });

    const inst = createInstance();
    const got = await inst.randomWallpaper();

    expect(got).toEqual({});
    expect(apiMocks.setActiveWallpaper).not.toHaveBeenCalled();
  });

  it('keeps the display wallpaper when activation fails', async () => {
    const image = buildWallpaper(9);
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: image });
    apiMocks.setActiveWallpaper.mockRejectedValue(new Error('denied'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const inst = createInstance();
    const got = await inst.randomWallpaper();
    await flushPromises();

    expect(got).toEqual(image);
    expect(warnSpy).toHaveBeenCalled();
    expect(inst.activeWallpaper.value).toBeNull();
  });

  it('throttles repeat switches within one second', async () => {
    apiMocks.getRandomWallpaper.mockResolvedValue({ data: null });
    const nowSpy = vi.spyOn(Date, 'now');
    const inst = createInstance();

    nowSpy.mockReturnValueOnce(1000);
    await inst.randomWallpaper();
    await flushPromises();
    // 1 次随机 + 2 次补货
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(3);

    nowSpy.mockReturnValueOnce(1099);
    expect(await inst.randomWallpaper()).toBeUndefined();
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(3);

    nowSpy.mockReturnValueOnce(3000);
    await inst.randomWallpaper();
    await flushPromises();
    expect(apiMocks.getRandomWallpaper).toHaveBeenCalledTimes(6);

    nowSpy.mockRestore();
  });
});
