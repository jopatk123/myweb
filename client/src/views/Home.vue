<template>
  <div class="home">
    <!-- 动态背景 -->
    <WallpaperBackground />
    
    <!-- 主要内容 -->
    <div class="content">
      <div class="welcome-section">
        <h1>欢迎使用 MyWeb</h1>
        <p>个性化你的桌面背景体验</p>
        
        <div class="quick-actions">
          <router-link to="/wallpapers" class="action-btn primary">
            管理壁纸
          </router-link>
          <button @click="randomWallpaper()" class="action-btn secondary">
            随机切换
          </button>
        </div>
      </div>

      <!-- 当前壁纸信息 -->
      <div v-if="activeWallpaper" class="current-wallpaper-info">
        <div class="info-card">
          <h3>当前壁纸</h3>
          <p class="wallpaper-name">{{ activeWallpaper.original_name }}</p>
          <p class="wallpaper-size">{{ formatFileSize(activeWallpaper.file_size) }}</p>
          <div class="wallpaper-actions">
            <router-link to="/wallpapers" class="btn btn-sm">
              更换壁纸
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮动控制按钮 -->
    <div class="floating-controls">
      <button
        @click="randomWallpaper()"
        class="control-btn"
        title="随机切换壁纸"
      >
        🎲
      </button>
      <router-link
        to="/wallpapers"
        class="control-btn"
        title="壁纸管理"
      >
        🖼️
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';
import WallpaperBackground from '@/components/wallpaper/WallpaperBackground.vue';

const {
  activeWallpaper,
  fetchActiveWallpaper,
  randomWallpaper
} = useWallpaper();

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

onMounted(() => {
  fetchActiveWallpaper();
});
</script>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  max-width: 800px;
  padding: 40px 20px;
}

.welcome-section h1 {
  font-size: 3.5rem;
  margin: 0 0 20px 0;
  font-weight: 300;
}

.welcome-section p {
  font-size: 1.2rem;
  margin: 0 0 40px 0;
  opacity: 0.9;
}

.quick-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 15px 30px;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.action-btn.primary {
  background: rgba(0, 123, 255, 0.8);
  color: white;
  border: 2px solid rgba(0, 123, 255, 0.3);
}

.action-btn.primary:hover {
  background: rgba(0, 123, 255, 1);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.3);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
}

.current-wallpaper-info {
  position: fixed;
  bottom: 30px;
  left: 30px;
  z-index: 3;
}

.info-card {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 200px;
}

.info-card h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.wallpaper-name {
  margin: 0 0 5px 0;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.wallpaper-size {
  margin: 0 0 15px 0;
  font-size: 12px;
  color: #999;
}

.wallpaper-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 12px;
  transition: background-color 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn:hover {
  background: rgba(255, 255, 255, 0.3);
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
  .welcome-section h1 {
    font-size: 2.5rem;
  }
  
  .quick-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .action-btn {
    width: 200px;
  }
  
  .current-wallpaper-info {
    bottom: 20px;
    left: 20px;
  }
  
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