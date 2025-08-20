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
      @delete-group="handleDeleteGroup"
      @apply-current="handleApplyCurrent"
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
        @open-main-window="openMainWindow"
      />

      <!-- 工具栏 -->
      <WallpaperToolbar v-model:keyword="keyword" />

      <!-- 筛选条（占位）已移除固定标签 -->
      <div class="filters-row">
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
        @set-active="handleSetActive"
        @delete="deleteWallpaper($event, selectedGroupId)"
        @edit="openEditModal"
      />

      <Toast v-model:modelValue="showToast" :message="toastMessage" type="success" />

      <!-- 空状态 -->
      <div v-if="!loading && filteredWallpapers.length === 0" class="empty-state">
        <p>暂无壁纸，点击右上方“上传壁纸”添加</p>
      </div>

      <!-- 分页控件 -->
      <div class="pagination-placeholder">
        <div class="pagination-controls">
          <button class="btn" :disabled="page === 1" @click="prevPage">上一页</button>
          <span>第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
          <button class="btn" :disabled="page === totalPages || totalPages === 0" @click="nextPage">下一页</button>
          <select v-model.number="limit" @change="onLimitChange">
            <option :value="10">10 / 页</option>
            <option :value="20">20 / 页</option>
            <option :value="50">50 / 页</option>
          </select>
          <span v-if="total">共 {{ total }} 条</span>
        </div>
      </div>

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
      <WallpaperEditModal v-if="showEditModal" :wallpaper="editingWallpaper" @close="showEditModal = false" @saved="onEditSaved" />
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
import WallpaperEditModal from '@/components/wallpaper/WallpaperEditModal.vue';
import GroupCreateModal from '@/components/wallpaper/GroupCreateModal.vue';
import GroupMoveModal from '@/components/wallpaper/GroupMoveModal.vue';
import Toast from '@/components/common/Toast.vue';

const {
  wallpapers,
  groups,
  activeWallpaper,
  loading,
  error,
  fetchWallpapers,
  fetchGroups,
  fetchCurrentGroup,
  fetchActiveWallpaper,
  setActiveWallpaper,
  deleteWallpaper,
  deleteGroup,
  randomWallpaper,
  deleteMultipleWallpapers,
  moveMultipleWallpapers,
  applyCurrentGroup,
  // pagination
  page,
  limit,
  total,
  setPage,
  setLimit
} = useWallpaper();

const selectedGroupId = ref('');
const showUploadModal = ref(false);
const showGroupModal = ref(false);
const showMoveModal = ref(false);
const showEditModal = ref(false);
const editingWallpaper = ref(null);
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
  setPage(1);
  fetchWallpapers(selectedGroupId.value || null, true);
  selectedIds.value = []; // 切换分组时清空选择
};

// 应用当前分组
const handleApplyCurrent = async () => {
  if (!selectedGroupId.value) return;
  try {
    await applyCurrentGroup(selectedGroupId.value);
    await fetchCurrentGroup();
    alert('已将该分组设为当前应用分组');
  } catch (err) {
    alert(err.message || '设置当前分组失败');
  }
};

// 壁纸上传成功处理
const onWallpaperUploaded = () => {
  showUploadModal.value = false;
  setPage(1);
  fetchWallpapers(selectedGroupId.value || null, true);
};

// 分组创建成功处理
const onGroupCreated = () => {
  showGroupModal.value = false;
  fetchGroups();
};

// 打开编辑对话框
const openEditModal = (wallpaper) => {
  editingWallpaper.value = wallpaper;
  showEditModal.value = true;
};

const onEditSaved = async () => {
  showEditModal.value = false;
  editingWallpaper.value = null;
  await fetchWallpapers(selectedGroupId.value || null, true);
  displayToast('编辑保存成功');
};

// 删除分组（来自侧栏按钮）
const handleDeleteGroup = async () => {
  if (!selectedGroupId.value) return;
  const g = groups.value.find(g => g.id === selectedGroupId.value);
  const name = g ? g.name : '';
  if (!confirm(`确定要删除分组 "${name}" 吗？此操作将不会删除分组下的壁纸。`)) return;

  try {
    await deleteGroup(selectedGroupId.value);
    // 如果刚删除的是当前选中，则切回全部
    selectedGroupId.value = '';
  await Promise.all([fetchGroups(), fetchWallpapers(null, true)]);
  } catch (err) {
    alert(err.message || '删除分组失败');
  }
};

// 打开主窗口
const openMainWindow = () => {
  window.open('/', '_blank');
};

// 无需确认的成功提示（toast）状态
const showToast = ref(false);
const toastMessage = ref('');

const displayToast = (msg, duration = 2000) => {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, duration);
};

// 包装后的设置背景处理，显示成功提示
const handleSetActive = async (id) => {
  try {
    await setActiveWallpaper(id);
    displayToast('设置成功');
  } catch (err) {
    alert(err.message || '设置为背景失败');
  }
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
    fetchWallpapers(null, true),
    fetchGroups(),
    fetchCurrentGroup(),
    fetchActiveWallpaper()
  ]);
});

const totalPages = computed(() => {
  return limit && total ? Math.max(1, Math.ceil(total.value / limit.value)) : 1;
});

const prevPage = async () => {
  if (page.value <= 1) return;
  setPage(page.value - 1);
  await fetchWallpapers(selectedGroupId.value || null, true);
};

const nextPage = async () => {
  if (page.value >= totalPages.value) return;
  setPage(page.value + 1);
  await fetchWallpapers(selectedGroupId.value || null, true);
};

const onLimitChange = async () => {
  setPage(1);
  setLimit(limit.value);
  await fetchWallpapers(selectedGroupId.value || null, true);
};
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

/* Toast 组件样式已被抽离到组件内，这里移除重复样式。 */

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
