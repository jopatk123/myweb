<template>
  <div class="home">
    <!-- 动态背景 -->
    <WallpaperBackground :wallpaper="current" />

    <!-- 桌面图标（内部应用） -->
    <AppIcons />

    <!-- 浮动控制按钮 -->
    <div class="floating-controls">
      <button
        @click="onRandom()"
        class="control-btn"
        title="随机切换壁纸"
      >
        🎲
      </button>
      <a
        href="/wallpapers"
        target="_blank"
        rel="noopener"
        class="control-btn"
        title="管理后台"
      >
        🛠️
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';
import WallpaperBackground from '@/components/wallpaper/WallpaperBackground.vue';
import AppIcons from '@/components/desktop/AppIcons.vue';

const { randomWallpaper, ensurePreloaded, fetchCurrentGroup } = useWallpaper();
const current = ref(null);

// 页面挂载时触发预加载（保持 2 张缓存）
fetchCurrentGroup().then(() => {
  // 不阻塞渲染，异步补充缓存
  ensurePreloaded(2).catch(() => {});
});

const onRandom = async () => {
  const w = await randomWallpaper();
  if (w) current.value = w;
  // 点击切换后确保缓存维持在 2 张
  ensurePreloaded(2).catch(() => {});
};
</script>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  width: 100%;
}

.floating-controls {
  position: fixed;
  bottom: 30px;
  right: 30px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 3;
}

.control-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .floating-controls {
    bottom: 20px;
    right: 20px;
  }
  
  .control-btn {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}
</style>