import { ref, computed } from 'vue';
import { wallpaperApi } from '@/api/wallpaper.js';

export function useWallpaper() {
  const wallpapers = ref([]);
  const groups = ref([]);
  const currentGroup = ref(null);
  const activeWallpaper = ref(null);
  const loading = ref(false);
  const error = ref(null);
    // 分页相关
    const page = ref(1);
    const limit = ref(20);
    const total = ref(0);

  // 获取所有壁纸，默认使用分页（向后兼容也可传 false）
  const fetchWallpapers = async (groupId = null, usePaging = true) => {
      loading.value = true;
      error.value = null;

      try {
  if (usePaging) {
          const resp = await wallpaperApi.getWallpapers(groupId, page.value, limit.value);
          // API 返回 { items, total }
          wallpapers.value = resp.data?.items || [];
          total.value = resp.data?.total || 0;
        } else {
          const response = await wallpaperApi.getWallpapers(groupId);
          wallpapers.value = response.data || [];
          total.value = wallpapers.value.length;
        }
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

  // 获取当前分组
  const fetchCurrentGroup = async () => {
    try {
      const response = await wallpaperApi.getCurrentGroup();
      currentGroup.value = response.data || null;
      return currentGroup.value;
    } catch (err) {
      console.warn('获取当前分组失败:', err);
      currentGroup.value = null;
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

  // 设置当前分组
  const applyCurrentGroup = async (id) => {
    try {
      const response = await wallpaperApi.setCurrentGroup(id);
      currentGroup.value = response.data || null;
      return currentGroup.value;
    } catch (err) {
      error.value = err.message || '设置当前分组失败';
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
    // 有绝对地址配置则拼绝对地址，否则使用相对路径走 Vite 代理
    const base = import.meta.env.VITE_API_BASE || '';
    return `${base ? `${base}/` : '/'}${wallpaper.file_path}`.replace(/\/+/, '/');
  };

  return {
    // 状态
    wallpapers,
    groups,
    currentGroup,
    activeWallpaper,
    loading,
    error,
  // 分页
  page,
  limit,
  total,
    
    // 计算属性
    hasWallpapers,
    hasGroups,
    
    // 方法
    fetchWallpapers,
  // 导出可直接修改的分页控制
  setPage: (p) => { page.value = Number(p) || 1; },
  setLimit: (l) => { limit.value = Number(l) || 20; },
    fetchGroups,
    fetchCurrentGroup,
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
    moveMultipleWallpapers,
    applyCurrentGroup
  };
}