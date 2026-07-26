<template>
  <div class="wallpaper-background">
    <!-- 默认背景 -->
    <div v-if="!currentWallpaper" class="default-background"></div>

    <!-- 用户壁纸（使用动画） -->
    <div
      v-else
      :key="wallpaperKey"
      class="user-wallpaper"
      :class="animationClass"
      :style="wallpaperStyle"
    ></div>

    <!-- 渐变遮罩 -->
    <div class="background-overlay"></div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch, onScopeDispose } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';
  import { useWallpaperAnimation } from '@/composables/useWallpaperAnimation.js';

  const props = defineProps({
    wallpaper: { type: Object, default: null },
  });

  const { activeWallpaper, fetchActiveWallpaper, getWallpaperUrl } =
    useWallpaper();

  // 初始化动画系统
  const wallpaperAnimation = useWallpaperAnimation({
    onAnimationEnd: () => {
      // 动画结束后的回调，可以在这里做一些清理工作
    },
  });

  const currentWallpaper = ref(null);
  const loadRetries = ref(0);
  const MAX_RETRIES = 3;

  // 壁纸唯一键，用于触发重新渲染和动画
  const wallpaperKey = ref(0);

  // 当前动画样式
  const currentAnimationStyle = ref(null);

  // 计算合并后的壁纸样式（背景图 + 动画样式）
  const wallpaperStyle = computed(() => {
    const baseStyle = {
      backgroundImage: currentWallpaper.value
        ? `url("${getWallpaperUrl(currentWallpaper.value)}")`
        : 'none',
    };

    if (currentAnimationStyle.value) {
      return { ...baseStyle, ...currentAnimationStyle.value };
    }

    return baseStyle;
  });

  // 动画类名
  const animationClass = computed(() => {
    return wallpaperAnimation.currentAnimationType.value
      ? `wallpaper-animation-${wallpaperAnimation.currentAnimationType.value}`
      : '';
  });

  // 监听传入的 wallpaper 或全局活跃壁纸变化
  const sourceWallpaper = ref(props.wallpaper || activeWallpaper.value);

  watch(
    () => props.wallpaper,
    val => {
      sourceWallpaper.value = val;
    },
    { immediate: true }
  );

  watch(activeWallpaper, val => {
    if (!props.wallpaper) {
      sourceWallpaper.value = val;
    }
  });

  const buildPreloadUrl = (wallpaper, retryCount) => {
    const baseUrl = getWallpaperUrl(wallpaper);
    if (!baseUrl) return null;
    if (!retryCount) return baseUrl;

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}_retry=${retryCount}_${Date.now()}`;
  };

  // 加载令牌：每次开始新壁纸加载时递增，过期回调通过比对令牌丢弃自身结果，
  // 避免快速切换壁纸时旧回调污染新状态。
  let loadToken = 0;
  let retryTimer = null;
  let pendingImage = null;

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const abortPendingLoad = () => {
    loadToken += 1;
    clearRetryTimer();
    if (pendingImage) {
      // 置空 src 以中止进行中的 Image 加载
      pendingImage.src = '';
      pendingImage = null;
    }
  };

  const updateWallpaper = wallpaper => {
    // 开始新一轮加载，使上一轮的回调与定时器失效
    abortPendingLoad();

    if (!wallpaper) {
      currentWallpaper.value = null;
      loadRetries.value = 0;
      return;
    }

    loadRetries.value = 0;
    const token = loadToken;

    const attemptLoad = retryCount => {
      if (token !== loadToken) return; // 已被新一轮加载取代

      const preloadUrl = buildPreloadUrl(wallpaper, retryCount);
      if (!preloadUrl) {
        currentWallpaper.value = null;
        return;
      }

      const img = new Image();
      pendingImage = img;
      img.onload = () => {
        if (token !== loadToken) return; // 丢弃过期回调
        pendingImage = null;

        currentWallpaper.value = wallpaper;

        // 壁纸加载成功后，播放随机动画
        currentAnimationStyle.value = null;
        const animationResult = wallpaperAnimation.playAnimation();
        if (animationResult) {
          currentAnimationStyle.value = animationResult.style;
          // 更新 key 以触发重新渲染
          wallpaperKey.value += 1;
        }
      };
      img.onerror = () => {
        if (token !== loadToken) return; // 丢弃过期回调
        pendingImage = null;

        if (retryCount < MAX_RETRIES) {
          const nextRetry = retryCount + 1;
          loadRetries.value = nextRetry;
          console.warn(
            `壁纸加载失败，第 ${nextRetry}/${MAX_RETRIES} 次重试...`
          );
          retryTimer = setTimeout(() => {
            retryTimer = null;
            attemptLoad(nextRetry);
          }, 1000 * nextRetry);
        } else {
          console.warn('壁纸加载失败，已重试', MAX_RETRIES, '次');
          // 加载失败后回退到默认背景，避免显示 broken image 占满桌面
          currentWallpaper.value = null;
          currentAnimationStyle.value = null;
        }
      };

      img.src = preloadUrl;
    };

    attemptLoad(0);
  };

  onScopeDispose(() => {
    // 组件卸载时使所有待处理回调失效并清理资源
    abortPendingLoad();
  });

  watch(
    sourceWallpaper,
    newWallpaper => {
      updateWallpaper(newWallpaper);
    },
    { immediate: true }
  );

  onMounted(() => {
    if (!props.wallpaper) {
      fetchActiveWallpaper();
    }
  });
</script>

<style scoped>
  .wallpaper-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    overflow: hidden;
  }

  .default-background {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }

  .user-wallpaper {
    width: 100%;
    height: 100%;
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
  }

  .background-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.1) 0%,
      rgba(0, 0, 0, 0.3) 100%
    );
    pointer-events: none;
  }

  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  /* 响应式背景 */
  @media (max-width: 768px) {
    .user-wallpaper {
      background-attachment: scroll;
      background-size: 100% 100%;
    }
  }

  /* 确保在所有设备上都能铺满 */
  @media (orientation: portrait) {
    .user-wallpaper {
      background-size: 100% 100%;
    }
  }

  @media (orientation: landscape) {
    .user-wallpaper {
      background-size: 100% 100%;
    }
  }
</style>
