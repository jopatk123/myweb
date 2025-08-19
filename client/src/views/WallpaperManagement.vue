<template>
  <div class="wallpaper-management">
    <div class="header">
      <h1>壁纸管理</h1>
      <div class="actions">
        <button @click="openMainWindow" class="btn btn-info">
          打开主窗口
        </button>
        <button @click="showUploadModal = true" class="btn btn-primary">
          上传壁纸
        </button>
        <button @click="showGroupModal = true" class="btn btn-secondary">
          新建分组
        </button>
        <button @click="randomWallpaper()" class="btn btn-accent">
          随机切换
        </button>
      </div>
    </div>

    <!-- 分组选择 -->
    <div class="group-selector">
      <label>选择分组：</label>
      <select v-model="selectedGroupId" @change="onGroupChange">
        <option value="">全部</option>
        <option v-for="group in groups" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      加载中...
    </div>

    <!-- 壁纸网格 -->
    <div v-else class="wallpaper-grid">
      <div
        v-for="wallpaper in wallpapers"
        :key="wallpaper.id"
        class="wallpaper-item"
        :class="{ active: activeWallpaper?.id === wallpaper.id }"
      >
        <div class="wallpaper-preview">
          <img
            :src="getWallpaperUrl(wallpaper)"
            :alt="wallpaper.original_name"
            @click="setActiveWallpaper(wallpaper.id)"
          />
          <div class="wallpaper-overlay">
            <button
              @click="setActiveWallpaper(wallpaper.id)"
              class="btn btn-sm btn-primary"
            >
              设为背景
            </button>
            <button
              @click="deleteWallpaper(wallpaper.id, selectedGroupId)"
              class="btn btn-sm btn-danger"
            >
              删除
            </button>
          </div>
        </div>
        <div class="wallpaper-info">
          <p class="wallpaper-name">{{ wallpaper.original_name }}</p>
          <p class="wallpaper-size">{{ formatFileSize(wallpaper.file_size) }}</p>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && !hasWallpapers" class="empty-state">
      <p>暂无壁纸，点击上传按钮添加壁纸</p>
    </div>

    <!-- 上传模态框 -->
    <WallpaperUploadModal
      v-if="showUploadModal"
      :groups="groups"
      @close="showUploadModal = false"
      @uploaded="onWallpaperUploaded"
    />

    <!-- 分组创建模态框 -->
    <GroupCreateModal
      v-if="showGroupModal"
      @close="showGroupModal = false"
      @created="onGroupCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';
import WallpaperUploadModal from '@/components/wallpaper/WallpaperUploadModal.vue';
import GroupCreateModal from '@/components/wallpaper/GroupCreateModal.vue';

const {
  wallpapers,
  groups,
  activeWallpaper,
  loading,
  error,
  hasWallpapers,
  fetchWallpapers,
  fetchGroups,
  fetchActiveWallpaper,
  setActiveWallpaper,
  deleteWallpaper,
  randomWallpaper,
  getWallpaperUrl
} = useWallpaper();

const selectedGroupId = ref('');
const showUploadModal = ref(false);
const showGroupModal = ref(false);

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 分组变化处理
const onGroupChange = () => {
  fetchWallpapers(selectedGroupId.value || null);
};

// 壁纸上传成功处理
const onWallpaperUploaded = () => {
  showUploadModal.value = false;
  fetchWallpapers(selectedGroupId.value || null);
};

// 分组创建成功处理
const onGroupCreated = () => {
  showGroupModal.value = false;
  fetchGroups();
};

// 打开主窗口
const openMainWindow = () => {
  window.open('/', '_blank');
};

// 初始化
onMounted(async () => {
  await Promise.all([
    fetchWallpapers(),
    fetchGroups(),
    fetchActiveWallpaper()
  ]);
});
</script>

<style scoped>
.wallpaper-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  color: #333;
}

.actions {
  display: flex;
  gap: 10px;
}

.group-selector {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-selector select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.wallpaper-item {
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.wallpaper-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.wallpaper-item.active {
  border-color: #007bff;
}

.wallpaper-preview {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.wallpaper-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.wallpaper-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.wallpaper-item:hover .wallpaper-overlay {
  opacity: 1;
}

.wallpaper-info {
  padding: 12px;
}

.wallpaper-name {
  margin: 0 0 4px 0;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallpaper-size {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-accent {
  background: #28a745;
  color: white;
}

.btn-accent:hover {
  background: #1e7e34;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}
</style>