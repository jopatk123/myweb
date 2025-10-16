import { ref, computed, unref } from 'vue';
import { wallpaperApi } from '@/api/wallpaper.js';
import { appEnv } from '@/constants/env.js';

export function useWallpaper() {
  const wallpapers = ref([]);
  const groups = ref([]);
  const currentGroup = ref(null);
  const activeWallpaper = ref(null);
  const loading = ref(false);
  const error = ref(null);
  // 预加载队列：存放已预加载的壁纸对象，含 groupKey 以支持分组
  const preloadedWallpapers = ref([]);
  const isPreloading = ref(false);
  // 分页相关
  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);

  // 通用响应解包：后端可能返回 { code, data, message } 格式
  const unwrap = res => {
    let r = res;
    // 一直剥离包装直到获得实际数据或 null
    while (
      r &&
      typeof r === 'object' &&
      Object.prototype.hasOwnProperty.call(r, 'data')
    ) {
      r = r.data;
    }
    return r;
  };

  // 获取所有壁纸，默认使用分页（向后兼容也可传 false）
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
      const data = unwrap(raw);
      // 支持两种返回格式：分页 { items, total } 或者直接数组
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

  // 获取分组
  const fetchGroups = async () => {
    try {
      const raw = await wallpaperApi.getGroups();
      const data = unwrap(raw);
      // data 可能直接是数组，或是包装 { items: [] }
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

  // 获取当前分组
  const fetchCurrentGroup = async () => {
    try {
      const raw = await wallpaperApi.getCurrentGroup();
      const data = unwrap(raw);
      currentGroup.value = data || null;
      return currentGroup.value;
    } catch (err) {
      console.warn('获取当前分组失败:', err);
      currentGroup.value = null;
    }
  };

  // 获取当前活跃壁纸
  const fetchActiveWallpaper = async () => {
    try {
      const raw = await wallpaperApi.getActiveWallpaper();
      const data = unwrap(raw);
      activeWallpaper.value = data || null;
    } catch (err) {
      console.warn('获取活跃壁纸失败:', err);
      activeWallpaper.value = null;
    }
  };

  // 上传壁纸
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
      const data = unwrap(raw);
      await fetchWallpapers(resolvedGroupId); // 刷新列表
      return data;
    } catch (err) {
      error.value = err.message || '上传失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 设置活跃壁纸
  const setActiveWallpaper = async id => {
    try {
      await wallpaperApi.setActiveWallpaper(id);
      // 立即获取更新后的活跃壁纸数据
      await fetchActiveWallpaper();
      // 确保UI能够立即响应，通过一个微任务延迟
      await new Promise(resolve => setTimeout(resolve, 0));
    } catch (err) {
      error.value = err.message || '设置失败';
      throw err;
    }
  };

  // 删除壁纸
  const deleteWallpaper = async (id, groupId = null) => {
    const resolvedGroupId = unref(groupId);
    try {
      await wallpaperApi.deleteWallpaper(id);
      await fetchWallpapers(resolvedGroupId); // 刷新列表

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
      const raw = await wallpaperApi.updateWallpaper(id, data);
      const res = unwrap(raw);
      await fetchWallpapers();
      return res;
    } catch (err) {
      error.value = err.message || '更新失败';
      throw err;
    }
  };

  // 随机切换壁纸
  // 随机获取一张壁纸并返回（返回值用于 Home.vue）
  // 规范化分组键（可能为 id，或 null）
  const normalizeGroupKey = groupId => {
    if (groupId) return groupId;
    // currentGroup 可能是 id 或对象
    if (currentGroup.value && typeof currentGroup.value === 'object')
      return currentGroup.value.id || null;
    return currentGroup.value || null;
  };

  // 确保预加载队列中至少有 count 张指定分组的壁纸
  const ensurePreloaded = async (count = 2, groupId = null) => {
    const key = normalizeGroupKey(groupId);
    if (isPreloading.value) return;
    // 只针对当前分组进行补充
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
          const w = unwrap(raw) || null;
          if (!w) continue;
          // 预加载图片资源
          await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = getWallpaperUrl(w) || w.url || '';
          });
          preloadedWallpapers.value.push({ groupKey: key, wallpaper: w });
        } catch (e) {
          // 单张失败则继续尝试下一张
          console.warn('预加载单张壁纸失败:', e);
        }
      }
    } finally {
      isPreloading.value = false;
    }
  };

  const consumePreloadedWallpaper = (groupId = null) => {
    const key = normalizeGroupKey(groupId);
    const idx = preloadedWallpapers.value.findIndex(p => p.groupKey === key);
    if (idx === -1) return null;
    const item = preloadedWallpapers.value.splice(idx, 1)[0];
    return item?.wallpaper || null;
  };

  // 随机切换壁纸（优先使用预加载队列）
  const randomWallpaper = async (groupId = null) => {
    const cached = consumePreloadedWallpaper(groupId);
    if (cached) {
      // 异步补充一张到队列，不阻塞返回
      ensurePreloaded(2, groupId).catch(() => {});
      return cached;
    }

    // 回退到原有逻辑
    if (loading.value) return null;
    loading.value = true;
    error.value = null;
    try {
      const raw = await wallpaperApi.getRandomWallpaper(groupId);
      const image = unwrap(raw) || null;
      if (image) {
        // 尝试预加载图片（使用 getWallpaperUrl 拼接最终 URL）
        await new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = getWallpaperUrl(image) || image.url || '';
        });
      }
      // 异步补充队列
      ensurePreloaded(2, groupId).catch(() => {});
      return image;
    } catch (err) {
      error.value = err.message || '随机切换失败';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 随机切换壁纸
  let lastRandomTime = 0;
  const randomWallpaperThrottled = () => {
    const now = Date.now();
    if (now - lastRandomTime < 1000) {
      return;
    }
    lastRandomTime = now;
    return randomWallpaper();
  };

  // 创建分组
  const createGroup = async data => {
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
    const resolvedGroupId = unref(currentGroupId);
    try {
      await wallpaperApi.deleteWallpapers(ids);
      await fetchWallpapers(resolvedGroupId); // 刷新列表
      if (activeWallpaper.value?.id) {
        const activeId = Number(activeWallpaper.value.id);
        const removed = (ids || []).some(id => Number(id) === activeId);
        if (removed) {
          await fetchActiveWallpaper();
        }
      }
    } catch (err) {
      error.value = err.message || '批量删除失败';
      throw err;
    }
  };

  // 批量移动壁纸
  const moveMultipleWallpapers = async (ids, targetGroupId, currentGroupId) => {
    const resolvedTargetGroupId = unref(targetGroupId);
    const resolvedCurrentGroupId = unref(currentGroupId);
    try {
      await wallpaperApi.moveWallpapers(ids, resolvedTargetGroupId);
      await fetchWallpapers(resolvedCurrentGroupId); // 刷新列表
    } catch (err) {
      error.value = err.message || '批量移动失败';
      throw err;
    }
  };

  // 删除分组
  const deleteGroup = async id => {
    try {
      await wallpaperApi.deleteGroup(id);
      await fetchGroups(); // 刷新分组列表
    } catch (err) {
      error.value = err.message || '删除分组失败';
      throw err;
    }
  };

  // 将指定分组设为当前应用分组
  const applyCurrentGroup = async id => {
    try {
      await wallpaperApi.setCurrentGroup(id);
      // 本地仅保存 id，组件通常会调用 fetchCurrentGroup() 刷新完整信息
      currentGroup.value = id;
      return currentGroup.value;
    } catch (err) {
      error.value = err.message || '设置当前分组失败';
      throw err;
    }
  };

  // 计算属性
  const hasWallpapers = computed(() => wallpapers.value.length > 0);
  const hasGroups = computed(() => groups.value.length > 0);

  // 获取壁纸URL
  const getWallpaperUrl = (wallpaper, options = {}) => {
    if (!wallpaper) return null;
    const fp = wallpaper.filePath || wallpaper.file_path || '';

    // 对于图片文件，应该直接使用相对路径，不经过API
    // 图片由后端静态服务直接提供
    let basePath = '';
    if (fp.startsWith('uploads/')) {
      basePath = `/${fp}`;
    } else {
      // 兼容其他情况
      const base = appEnv.apiBase || '';
      const pathPart = String(fp).replace(/^\/+/, '');
      if (base) {
        basePath = `${String(base).replace(/\/+$/, '')}/${pathPart}`;
      } else {
        basePath = `/${pathPart}`;
      }
    }

    // 添加版本参数以避免浏览器缓存问题
    // 使用 updatedAt 作为版本标识符
    if (options.addVersion !== false) {
      const updatedAt = wallpaper.updatedAt || wallpaper.updated_at;
      if (updatedAt) {
        const ts = new Date(updatedAt).getTime();
        if (!Number.isNaN(ts)) {
          const separator = basePath.includes('?') ? '&' : '?';
          return `${basePath}${separator}v=${ts}`;
        }
      }
    }

    return basePath;
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
    setPage: p => {
      page.value = Number(p) || 1;
    },
    setLimit: l => {
      limit.value = Number(l) || 20;
    },
    fetchGroups,
    fetchCurrentGroup,
    fetchActiveWallpaper,
    uploadWallpaper,
    setActiveWallpaper,
    deleteWallpaper,
    updateWallpaper,
    randomWallpaper: randomWallpaperThrottled,
    // 允许外部触发预加载（例如在桌面加载时自动补充）
    ensurePreloaded,
    consumePreloadedWallpaper,
    createGroup,
    deleteGroup,
    getWallpaperUrl,
    deleteMultipleWallpapers,
    moveMultipleWallpapers,
    applyCurrentGroup,
  };
}
