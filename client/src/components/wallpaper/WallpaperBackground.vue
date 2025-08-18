<template>
  <div class="wallpaper-background">
    <!-- 默认背景 -->
    <div
      v-if="!currentWallpaper"
      class="default-background"
    ></div>
    
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

const {
  activeWallpaper,
  fetchActiveWallpaper,
  getWallpaperUrl
} = useWallpaper();

const currentWallpaper = ref(null);

// 监听活跃壁纸变化
watch(activeWallpaper, (newWallpaper) => {
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
}, { immediate: true });

onMounted(() => {
  fetchActiveWallpaper();
});
</script>

<style scoped>
.wallpaper-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
}

.default-background {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, 
    #667eea 0%, 
    #764ba2 100%
  );
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

.user-wallpaper {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
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
  }
}
</style>