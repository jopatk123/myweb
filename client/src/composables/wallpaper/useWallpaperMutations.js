import { unref } from 'vue';
import { wallpaperApi } from '@/api/wallpaper.js';
import { unwrapData } from '@/api/httpClient.js';

/**
 * 壁纸/分组的增删改操作。共享状态 ref 由调用方传入，函数内部只触发刷新，避免循环依赖。
 */
export function createWallpaperMutations({
  activeWallpaper,
  currentGroup,
  loading,
  error,
  fetchWallpapers,
  fetchActiveWallpaper,
}) {
  const uploadWallpaper = async (
    file,
    groupId = null,
    name,
    onUploadProgress
  ) => {
    const resolvedGroupId = unref(groupId);
    loading.value = true;
    error.value = null;
    try {
      const raw = await wallpaperApi.uploadWallpaper(
        file,
        resolvedGroupId,
        name,
        onUploadProgress
      );
      const data = unwrapData(raw);
      await fetchWallpapers(resolvedGroupId);
      return data;
    } catch (err) {
      error.value = err.message || '上传失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteWallpaper = async (id, groupId = null) => {
    const resolvedGroupId = unref(groupId);
    try {
      await wallpaperApi.deleteWallpaper(id);
      await fetchWallpapers(resolvedGroupId);
      if (activeWallpaper.value?.id === id) {
        await fetchActiveWallpaper();
      }
    } catch (err) {
      error.value = err.message || '删除失败';
      throw err;
    }
  };

  const updateWallpaper = async (id, data) => {
    try {
      const raw = await wallpaperApi.updateWallpaper(id, data);
      return unwrapData(raw);
    } catch (err) {
      error.value = err.message || '更新失败';
      throw err;
    }
  };

  const createGroup = async data => {
    try {
      const response = await wallpaperApi.createGroup(data);
      return response.data;
    } catch (err) {
      error.value = err.message || '创建分组失败';
      throw err;
    }
  };

  const deleteGroup = async id => {
    try {
      await wallpaperApi.deleteGroup(id);
    } catch (err) {
      error.value = err.message || '删除分组失败';
      throw err;
    }
  };

  const deleteMultipleWallpapers = async (ids, currentGroupId) => {
    const resolvedGroupId = unref(currentGroupId);
    try {
      await wallpaperApi.deleteWallpapers(ids);
      await fetchWallpapers(resolvedGroupId);
      if (activeWallpaper.value?.id) {
        const activeId = Number(activeWallpaper.value.id);
        const removed = (ids || []).some(id => Number(id) === activeId);
        if (removed) await fetchActiveWallpaper();
      }
    } catch (err) {
      error.value = err.message || '批量删除失败';
      throw err;
    }
  };

  const moveMultipleWallpapers = async (ids, targetGroupId, currentGroupId) => {
    const resolvedTargetGroupId = unref(targetGroupId);
    const resolvedCurrentGroupId = unref(currentGroupId);
    try {
      await wallpaperApi.moveWallpapers(ids, resolvedTargetGroupId);
      await fetchWallpapers(resolvedCurrentGroupId);
    } catch (err) {
      error.value = err.message || '批量移动失败';
      throw err;
    }
  };

  const applyCurrentGroup = async id => {
    try {
      await wallpaperApi.setCurrentGroup(id);
      currentGroup.value = id;
      return currentGroup.value;
    } catch (err) {
      error.value = err.message || '设置当前分组失败';
      throw err;
    }
  };

  return {
    uploadWallpaper,
    deleteWallpaper,
    updateWallpaper,
    createGroup,
    deleteGroup,
    deleteMultipleWallpapers,
    moveMultipleWallpapers,
    applyCurrentGroup,
  };
}
