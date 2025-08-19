import { ref, computed } from 'vue';
import { wallpaperApi } from '@/api/wallpaper.js';

export function useWallpaper() {
  const wallpapers = ref([]);
  const groups = ref([]);
  const activeWallpaper = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // 获取所有壁纸
  const fetchWallpapers = async (groupId = null) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await wallpaperApi.getWallpapers(groupId);
      wallpapers.value = response.data || [];
    } catch (err) {
      error.value = err.message || '获取壁纸失败';
      console.error('获取壁纸失败:', err);
    } finally {
      loading.value = false;
    }
  };

  // 获取分组
  const fetchGroups = async () => {
    try {
      const response = await wallpaperApi.getGroups();
      groups.value = response.data || [];
    } catch (err) {
      error.value = err.message || '获取分组失败';
      console.error('获取分组失败:', err);
    }
  };

  // 获取当前活跃壁纸
  const fetchActiveWallpaper = async () => {
    try {
      const response = await wallpaperApi.getActiveWallpaper();
      activeWallpaper.value = response.data;
    } catch (err) {
      console.warn('获取活跃壁纸失败:', err);
      activeWallpaper.value = null;
    }
  };

  // 上传壁纸
  const uploadWallpaper = async (file, groupId = null, name, onUploadProgress) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await wallpaperApi.uploadWallpaper(file, groupId, name, onUploadProgress);
      await fetchWallpapers(groupId); // 刷新列表
      return response.data;
    } catch (err) {
      error.value = err.message || '上传失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 设置活跃壁纸
  const setActiveWallpaper = async (id) => {
    try {
      await wallpaperApi.setActiveWallpaper(id);
      await fetchActiveWallpaper();
    } catch (err) {
      error.value = err.message || '设置失败';
      throw err;
    }
  };

  // 删除壁纸
  const deleteWallpaper = async (id, groupId = null) => {
    try {
      await wallpaperApi.deleteWallpaper(id);
      await fetchWallpapers(groupId); // 刷新列表
      
      // 如果删除的是当前活跃壁纸，重新获取
      if (activeWallpaper.value?.id === id) {
        await fetchActiveWallpaper();
      }
    } catch (err) {
      error.value = err.message || '删除失败';
      throw err;
    }
  };

  // 更新壁纸（例如修改名称）
  const updateWallpaper = async (id, data) => {
    try {
      const response = await wallpaperApi.updateWallpaper(id, data);
      await fetchWallpapers();
      return response.data;
    } catch (err) {
      error.value = err.message || '更新失败';
      throw err;
    }
  };

  // 随机切换壁纸
  const randomWallpaper = async (groupId = null) => {
    try {
      const response = await wallpaperApi.getRandomWallpaper(groupId);
      if (response.data) {
        activeWallpaper.value = response.data;
      }
      return response.data;
    } catch (err) {
      error.value = err.message || '随机切换失败';
      throw err;
    }
  };

  // 创建分组
  const createGroup = async (data) => {
    try {
      const response = await wallpaperApi.createGroup(data);
      await fetchGroups(); // 刷新分组列表
      return response.data;
    } catch (err) {
      error.value = err.message || '创建分组失败';
      throw err;
    }
  };

  // 批量删除壁纸
  const deleteMultipleWallpapers = async (ids, currentGroupId) => {
    try {
      await wallpaperApi.deleteWallpapers(ids);
      await fetchWallpapers(currentGroupId); // 刷新列表
    } catch (err) {
      error.value = err.message || '批量删除失败';
      throw err;
    }
  };

  // 批量移动壁纸
  const moveMultipleWallpapers = async (ids, targetGroupId, currentGroupId) => {
    try {
      await wallpaperApi.moveWallpapers(ids, targetGroupId);
      await fetchWallpapers(currentGroupId); // 刷新列表
    } catch (err) {
      error.value = err.message || '批量移动失败';
      throw err;
    }
  };

  // 删除分组
  const deleteGroup = async (id) => {
    try {
      await wallpaperApi.deleteGroup(id);
      await fetchGroups(); // 刷新分组列表
    } catch (err) {
      error.value = err.message || '删除分组失败';
      throw err;
    }
  };

  // 计算属性
  const hasWallpapers = computed(() => wallpapers.value.length > 0);
  const hasGroups = computed(() => groups.value.length > 0);

  // 获取壁纸URL
  const getWallpaperUrl = (wallpaper) => {
    if (!wallpaper) return null;
    return `${import.meta.env.VITE_API_BASE || 'http://localhost:3002'}/${wallpaper.file_path}`;
  };

  return {
    // 状态
    wallpapers,
    groups,
    activeWallpaper,
    loading,
    error,
    
    // 计算属性
    hasWallpapers,
    hasGroups,
    
    // 方法
    fetchWallpapers,
    fetchGroups,
    fetchActiveWallpaper,
    uploadWallpaper,
    setActiveWallpaper,
    deleteWallpaper,
    updateWallpaper,
    randomWallpaper,
    createGroup,
    deleteGroup,
    getWallpaperUrl,
    deleteMultipleWallpapers,
    moveMultipleWallpapers
  };
}