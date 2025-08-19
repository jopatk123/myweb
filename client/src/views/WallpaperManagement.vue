<template>
  <div class="admin-layout">
    <!-- 全局侧边栏 -->
    <aside class="global-sider">
      <div class="brand">管理后台</div>
      <nav class="global-menu">
        <a class="menu-item active">壁纸管理</a>
        <a class="menu-item disabled">任务中心</a>
        <a class="menu-item disabled">系统设置</a>
      </nav>
    </aside>

    <!-- 模块侧边栏 -->
    <WallpaperSidebar
      :groups="groups"
      :selected-group-id="selectedGroupId"
      @select-group="selectGroup"
      @create-group="showGroupModal = true"
    />

    <!-- 主内容区 -->
    <main class="content-area">
      <!-- 顶部 -->
      <WallpaperHeader
        :selected-count="selectedIds.length"
        @upload-wallpaper="showUploadModal = true"
        @random-wallpaper="randomWallpaper(selectedGroupId || null)"
        @bulk-delete="handleBulkDelete"
        @bulk-move="showMoveModal = true"
      />

      <!-- 工具栏 -->
      <WallpaperToolbar v-model:keyword="keyword" />

      <!-- 筛选条（占位） -->
      <div class="filters-row">
        <span class="filter-chip">类型</span>
        <span class="filter-chip">缩略图</span>
        <span class="filter-chip">描述</span>
        <span class="filter-chip" v-if="selectedGroupId">分组: {{ displayCurrentGroup }}</span>
      </div>

      <!-- 提示/加载 -->
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="loading" class="loading">加载中...</div>

      <!-- 内容列表 -->
      <WallpaperList
        v-if="!loading"
        v-model="selectedIds"
        :wallpapers="filteredWallpapers"
        :active-wallpaper="activeWallpaper"
        @set-active="setActiveWallpaper"
        @delete="deleteWallpaper($event, selectedGroupId)"
      />

      <!-- 空状态 -->
      <div v-if="!loading && filteredWallpapers.length === 0" class="empty-state">
        <p>暂无壁纸，点击右上方“上传壁纸”添加</p>
      </div>

      <!-- 分页占位 -->
      <div class="pagination-placeholder">分页区</div>

      <!-- 模态框 -->
      <WallpaperUploadModal
        v-if="showUploadModal"
        :groups="groups"
        @close="showUploadModal = false"
        @uploaded="onWallpaperUploaded"
      />
      <GroupCreateModal
        v-if="showGroupModal"
        @close="showGroupModal = false"
        @created="onGroupCreated"
      />
      <GroupMoveModal
        v-if="showMoveModal"
        :count="selectedIds.length"
        :groups="groups"
        @close="showMoveModal = false"
        @confirm="handleBulkMove"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';
import WallpaperSidebar from '@/components/wallpaper/WallpaperSidebar.vue';
import WallpaperHeader from '@/components/wallpaper/WallpaperHeader.vue';
import WallpaperToolbar from '@/components/wallpaper/WallpaperToolbar.vue';
import WallpaperList from '@/components/wallpaper/WallpaperList.vue';
import WallpaperUploadModal from '@/components/wallpaper/WallpaperUploadModal.vue';
import GroupCreateModal from '@/components/wallpaper/GroupCreateModal.vue';
import GroupMoveModal from '@/components/wallpaper/GroupMoveModal.vue';

const {
  wallpapers,
  groups,
  activeWallpaper,
  loading,
  error,
  fetchWallpapers,
  fetchGroups,
  fetchActiveWallpaper,
  setActiveWallpaper,
  deleteWallpaper,
  randomWallpaper,
  deleteMultipleWallpapers,
  moveMultipleWallpapers,
} = useWallpaper();

const selectedGroupId = ref('');
const showUploadModal = ref(false);
const showGroupModal = ref(false);
const showMoveModal = ref(false);
const keyword = ref('');
const selectedIds = ref([]);

// 批量删除
const handleBulkDelete = async () => {
  if (selectedIds.value.length === 0) return;
  if (confirm(`确定要删除选中的 ${selectedIds.value.length} 张壁纸吗？`)) {
    await deleteMultipleWallpapers(selectedIds.value, selectedGroupId.value);
    selectedIds.value = []; // 清空选择
  }
};

// 批量移动
const handleBulkMove = async (targetGroupId) => {
  if (selectedIds.value.length === 0) return;
  await moveMultipleWallpapers(selectedIds.value, targetGroupId, selectedGroupId.value);
  selectedIds.value = []; // 清空选择
  showMoveModal.value = false;
};

// 侧栏分组选择
const selectGroup = (id) => {
  selectedGroupId.value = id || '';
  fetchWallpapers(selectedGroupId.value || null);
  selectedIds.value = []; // 切换分组时清空选择
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
    (w.name || w.original_name || '').toLowerCase().includes(k)
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

.content-area {
  padding: 20px;
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
