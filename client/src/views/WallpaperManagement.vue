<template>
  <div class="admin-layout">
    <!-- 全局侧边栏：管理后台导航 -->
    <aside class="global-sider">
      <div class="brand">管理后台</div>
      <nav class="global-menu">
        <a class="menu-item active">壁纸管理</a>
        <a class="menu-item disabled">任务中心</a>
        <a class="menu-item disabled">系统设置</a>
      </nav>
    </aside>

    <!-- 模块侧边栏：分组管理 -->
    <aside class="module-sider">
      <div class="module-header-row">
        <div class="module-title">分组管理</div>
        <button class="btn btn-secondary btn-sm" @click="showGroupModal = true">新建</button>
      </div>
      <div class="group-list">
        <div
          class="group-item"
          :class="{ active: selectedGroupId === '' }"
          @click="selectGroup('')"
        >
          全部壁纸
        </div>
        <div
          v-for="group in groups"
          :key="group.id"
          class="group-item"
          :class="{ active: selectedGroupId === group.id }"
          @click="selectGroup(group.id)"
        >
          {{ group.name }}
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="content-area">
      <!-- 顶部：页面标题与按钮区（占位可扩展） -->
      <div class="page-header">
        <h1>壁纸管理</h1>
        <div class="action-buttons">
          <button @click="openMainWindow" class="btn btn-info">主窗口</button>
          <button @click="showUploadModal = true" class="btn btn-primary">上传壁纸</button>
          <button @click="randomWallpaper(selectedGroupId || null)" class="btn btn-accent">随机切换</button>
          <button class="btn btn-secondary" disabled>更多…</button>
        </div>
      </div>

      <!-- 搜索与按钮区（占位） -->
      <div class="toolbar">
        <input v-model="keyword" class="search-input" placeholder="搜索：名称/备注/关键字…" />
        <div class="toolbar-actions">
          <button class="btn btn-secondary btn-sm" disabled>批量操作</button>
          <button class="btn btn-secondary btn-sm" disabled>导入</button>
          <button class="btn btn-secondary btn-sm" disabled>导出</button>
        </div>
      </div>

      <!-- 筛选条（占位） -->
      <div class="filters-row">
        <span class="filter-chip">类型</span>
        <span class="filter-chip">缩略图</span>
        <span class="filter-chip">评级</span>
        <span class="filter-chip">描述</span>
        <span class="filter-chip" v-if="selectedGroupId">分组: {{ displayCurrentGroup }}</span>
      </div>

      <!-- 提示/加载 -->
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="loading" class="loading">加载中...</div>

      <!-- 内容区：壁纸列表 -->
      <div v-if="!loading" class="wallpaper-list">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>缩略图</th>
              <th>文件大小</th>
              <th>上传时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wallpaper in filteredWallpapers" :key="wallpaper.id" :class="{ active: activeWallpaper?.id === wallpaper.id }">
              <td>{{ wallpaper.name || wallpaper.original_name }}</td>
              <td>
                <img :src="getWallpaperUrl(wallpaper)" :alt="wallpaper.name" class="thumbnail" />
              </td>
              <td>{{ formatFileSize(wallpaper.file_size) }}</td>
              <td>{{ new Date(wallpaper.created_at).toLocaleString() }}</td>
              <td>
                <button @click="setActiveWallpaper(wallpaper.id)" class="btn btn-sm btn-primary">设为背景</button>
                <button @click="deleteWallpaper(wallpaper.id, selectedGroupId)" class="btn btn-sm btn-danger">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredWallpapers.length === 0" class="empty-state">
        <p>暂无壁纸，点击右上方“上传壁纸”添加</p>
      </div>

      <!-- 分页占位 -->
      <div class="pagination-placeholder">分页区</div>

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
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
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
const keyword = ref('');

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

// 侧栏分组选择
const selectGroup = (id) => {
  selectedGroupId.value = id || '';
  onGroupChange();
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

// 计算后的展示数据
const filteredWallpapers = computed(() => {
  const list = wallpapers.value || [];
  const k = keyword.value.trim().toLowerCase();
  if (!k) return list;
  return list.filter(w =>
    (w.original_name || '').toLowerCase().includes(k)
  );
});

const displayCurrentGroup = computed(() => {
  const g = groups.value.find(g => g.id === selectedGroupId.value);
  return g ? g.name : '';
});

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
/* 三栏管理后台布局 */
.admin-layout {
  display: grid;
  grid-template-columns: 200px 260px 1fr;
  grid-template-rows: 1fr;
  min-height: 100vh;
}

.global-sider {
  background: #0f172a;
  color: #e2e8f0;
  padding: 16px 12px;
}

.brand {
  font-weight: 700;
  font-size: 18px;
  margin-bottom: 20px;
}

.global-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-item {
  display: block;
  padding: 10px 12px;
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 6px;
}

.menu-item.active {
  background: #1e293b;
  color: #fff;
}

.menu-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.module-sider {
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 16px;
}

.module-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.module-title {
  font-weight: 600;
  color: #111827;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: #111827;
}

.group-item:hover {
  background: #f3f4f6;
}

.group-item.active {
  background: #e0e7ff;
  color: #1d4ed8;
}

.content-area {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.page-header h1 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0 16px 0;
  color: #374151;
}

.filter-chip {
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 999px;
  font-size: 12px;
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
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
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

.pagination-placeholder {
  padding: 16px 0 4px 0;
  color: #6b7280;
  text-align: center;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn-primary { background: #007bff; color: white; }
.btn-primary:hover { background: #0056b3; }
.btn-secondary { background: #6c757d; color: white; }
.btn-secondary:hover { background: #545b62; }
.btn-accent { background: #28a745; color: white; }
.btn-accent:hover { background: #1e7e34; }
.btn-danger { background: #dc3545; color: white; }
.btn-danger:hover { background: #c82333; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-info { background: #17a2b8; color: white; }
.btn-info:hover { background: #138496; }

/* 新增列表样式 */
.wallpaper-list table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.wallpaper-list th, .wallpaper-list td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: middle;
}

.wallpaper-list th {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.wallpaper-list tr.active {
  background-color: #eff6ff;
}

.thumbnail {
  width: 100px;
  height: 56.25px; /* 16:9 */
  object-fit: cover;
  border-radius: 4px;
}

.wallpaper-list td .btn {
  margin-right: 8px;
}

@media (max-width: 1024px) {
  .admin-layout {
    grid-template-columns: 160px 220px 1fr;
  }
}

@media (max-width: 768px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }
  .global-sider, .module-sider {
    display: none;
  }
}
</style>