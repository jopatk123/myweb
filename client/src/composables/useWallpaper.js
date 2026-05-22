import { ref, computed } from 'vue';
import { createWallpaperQuery } from './wallpaper/useWallpaperQuery.js';
import { createWallpaperMutations } from './wallpaper/useWallpaperMutations.js';
import { createWallpaperRandom } from './wallpaper/useWallpaperRandom.js';
import {
  getWallpaperUrl,
  downloadWallpapers as downloadWallpapersUtil,
} from './wallpaper/wallpaperUrl.js';

/**
 * 壁纸 composable 聚合入口：
 * 整合查询、变更、随机预加载三个子模块，并暴露统一接口给页面/组件使用。
 */
export function useWallpaper() {
  const wallpapers = ref([]);
  const groups = ref([]);
  const currentGroup = ref(null);
  const activeWallpaper = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);

  const query = createWallpaperQuery({
    wallpapers,
    groups,
    currentGroup,
    activeWallpaper,
    loading,
    error,
    page,
    limit,
    total,
  });

  const mutations = createWallpaperMutations({
    activeWallpaper,
    currentGroup,
    loading,
    error,
    fetchWallpapers: query.fetchWallpapers,
    fetchActiveWallpaper: query.fetchActiveWallpaper,
  });

  const random = createWallpaperRandom({ currentGroup, loading, error });

  const hasWallpapers = computed(() => wallpapers.value.length > 0);
  const hasGroups = computed(() => groups.value.length > 0);

  const downloadWallpapers = async ids => {
    try {
      return await downloadWallpapersUtil(ids);
    } catch (err) {
      error.value = err.message || '下载失败';
      throw err;
    }
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

    // 查询
    ...query,
    setPage: p => {
      page.value = Number(p) || 1;
    },
    setLimit: l => {
      limit.value = Number(l) || 20;
    },

    // 变更
    ...mutations,

    // 随机/预加载
    randomWallpaper: random.randomWallpaper,
    ensurePreloaded: random.ensurePreloaded,
    consumePreloadedWallpaper: random.consumePreloadedWallpaper,

    // 工具
    getWallpaperUrl,
    downloadWallpapers,
  };
}
