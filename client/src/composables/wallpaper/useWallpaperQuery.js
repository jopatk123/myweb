import { unref } from 'vue';
import { wallpaperApi } from '@/api/wallpaper.js';
import { unwrapData } from '@/api/httpClient.js';

/**
 * 壁纸列表、分组、活跃壁纸等读取操作。
 * 共享的 state ref 由调用方传入，函数内只更新 state，便于在主 composable 中聚合。
 */
export function createWallpaperQuery({
  wallpapers,
  groups,
  currentGroup,
  activeWallpaper,
  loading,
  error,
  page,
  limit,
  total,
}) {
  const fetchWallpapers = async (groupId = null, usePaging = true) => {
    const resolvedGroupId = unref(groupId);
    loading.value = true;
    error.value = null;

    try {
      const raw = await wallpaperApi.getWallpapers(
        resolvedGroupId,
        usePaging ? page.value : null,
        usePaging ? limit.value : null
      );
      const data = unwrapData(raw);
      if (usePaging && data) {
        wallpapers.value = data.items || [];
        total.value = data.total || 0;
      } else {
        const list = Array.isArray(data) ? data : (data && data.items) || [];
        wallpapers.value = list;
        total.value = list.length;
      }
    } catch (err) {
      error.value = err.message || '获取壁纸失败';
      console.error('获取壁纸失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchGroups = async () => {
    try {
      const raw = await wallpaperApi.getGroups();
      const data = unwrapData(raw);
      if (Array.isArray(data)) {
        groups.value = data;
      } else if (data && Array.isArray(data.items)) {
        groups.value = data.items;
      } else {
        groups.value = [];
      }
    } catch (err) {
      error.value = err.message || '获取分组失败';
      console.error('获取分组失败:', err);
    }
  };

  const fetchCurrentGroup = async () => {
    try {
      const raw = await wallpaperApi.getCurrentGroup();
      const data = unwrapData(raw);
      currentGroup.value = data || null;
      return currentGroup.value;
    } catch (err) {
      console.warn('获取当前分组失败:', err);
      currentGroup.value = null;
    }
  };

  const fetchActiveWallpaper = async () => {
    try {
      const raw = await wallpaperApi.getActiveWallpaper();
      const data = unwrapData(raw);
      activeWallpaper.value = data || null;
    } catch (err) {
      console.warn('获取活跃壁纸失败:', err);
      activeWallpaper.value = null;
    }
  };

  return {
    fetchWallpapers,
    fetchGroups,
    fetchCurrentGroup,
    fetchActiveWallpaper,
  };
}
