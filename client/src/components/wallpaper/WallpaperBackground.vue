<template>
  <div class="wallpaper-background">
    <!-- 默认背景 -->
    <div v-if="!currentWallpaper" class="default-background"></div>

    <!-- 用户壁纸 -->
    <div
      v-else
      class="user-wallpaper"
      :style="{ backgroundImage: `url(${getWallpaperUrl(currentWallpaper)})` }"
    ></div>

    <!-- 渐变遮罩 -->
    <div class="background-overlay"></div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';

  const props = defineProps({
    wallpaper: { type: Object, default: null },
  });

  const { activeWallpaper, fetchActiveWallpaper, getWallpaperUrl } =
    useWallpaper();

  const currentWallpaper = ref(null);

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

  watch(
    sourceWallpaper,
    newWallpaper => {
      if (newWallpaper) {
        // 预加载图片
        const img = new Image();
        img.onload = () => {
          currentWallpaper.value = newWallpaper;
        };
        img.src = getWallpaperUrl(newWallpaper);
      } else {
        currentWallpaper.value = null;
      }
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
    transition: opacity 0.5s ease;
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
