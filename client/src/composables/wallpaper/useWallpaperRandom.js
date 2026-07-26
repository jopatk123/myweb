import { ref } from 'vue';
import { wallpaperApi } from '@/api/wallpaper.js';
import { unwrapData } from '@/api/httpClient.js';
import { getWallpaperUrl } from './wallpaperUrl.js';

const RANDOM_THROTTLE_MS = 1000;

/**
 * 壁纸预加载队列与随机切换。
 * 预加载根据分组键缓存，切换时优先消费缓存以减少切换抖动。
 */
export function createWallpaperRandom({ currentGroup, loading, error }) {
  const preloadedWallpapers = ref([]);
  const isPreloading = ref(false);

  function normalizeGroupKey(groupId) {
    if (groupId) return groupId;
    if (currentGroup.value && typeof currentGroup.value === 'object') {
      return currentGroup.value.id || null;
    }
    return currentGroup.value || null;
  }

  async function ensurePreloaded(count = 2, groupId = null) {
    const key = normalizeGroupKey(groupId);
    if (isPreloading.value) return;
    const existing = preloadedWallpapers.value.filter(
      p => p.groupKey === key
    ).length;
    const need = Math.max(0, count - existing);
    if (need === 0) return;

    isPreloading.value = true;
    try {
      for (let i = 0; i < need; i++) {
        try {
          const raw = await wallpaperApi.getRandomWallpaper(key);
          const w = unwrapData(raw) || null;
          if (!w) continue;
          await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = getWallpaperUrl(w) || w.url || '';
          });
          preloadedWallpapers.value.push({ groupKey: key, wallpaper: w });
        } catch (e) {
          console.warn('预加载单张壁纸失败:', e);
        }
      }
    } finally {
      isPreloading.value = false;
    }
  }

  function consumePreloadedWallpaper(groupId = null) {
    const key = normalizeGroupKey(groupId);
    const idx = preloadedWallpapers.value.findIndex(p => p.groupKey === key);
    if (idx === -1) return null;
    const item = preloadedWallpapers.value.splice(idx, 1)[0];
    return item?.wallpaper || null;
  }

  // 拿到随机壁纸后，显式调用 PUT /:id/active 切换活跃状态。
  // 后端 GET /random 已改为无副作用，前端需自行触发切换。
  // 异步执行，不阻塞主流程；失败仅警告，不影响壁纸显示。
  function applyActiveWallpaper(wallpaper) {
    if (wallpaper?.id == null) return;
    wallpaperApi.setActiveWallpaper(wallpaper.id).catch(err => {
      console.warn('设置活跃壁纸失败:', err);
    });
  }

  async function randomWallpaper(groupId = null) {
    const cached = consumePreloadedWallpaper(groupId);
    if (cached) {
      applyActiveWallpaper(cached);
      void ensurePreloaded(2, groupId).catch(err => {
        console.warn('预加载壁纸失败:', err);
      });
      return cached;
    }

    if (loading.value) return null;
    loading.value = true;
    error.value = null;
    try {
      const raw = await wallpaperApi.getRandomWallpaper(groupId);
      const image = unwrapData(raw) || null;
      if (image) {
        await new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = getWallpaperUrl(image) || image.url || '';
        });
      }
      applyActiveWallpaper(image);
      void ensurePreloaded(2, groupId).catch(err => {
        console.warn('预加载壁纸失败:', err);
      });
      return image;
    } catch (err) {
      error.value = err.message || '随机切换失败';
      return null;
    } finally {
      loading.value = false;
    }
  }

  let lastRandomTime = 0;
  function randomWallpaperThrottled() {
    const now = Date.now();
    if (now - lastRandomTime < RANDOM_THROTTLE_MS) return;
    lastRandomTime = now;
    return randomWallpaper();
  }

  return {
    preloadedWallpapers,
    isPreloading,
    ensurePreloaded,
    consumePreloadedWallpaper,
    randomWallpaper: randomWallpaperThrottled,
  };
}
