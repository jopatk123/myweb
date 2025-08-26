<template>
  <div class="admin-layout">
    <!-- 全局侧边栏 -->
    <aside class="global-sider">
      <div class="brand">管理后台</div>
      <nav class="global-menu">
        <router-link to="/wallpapers" class="menu-item">壁纸管理</router-link>
        <a class="menu-item active">应用管理</a>
        <router-link to="/files" class="menu-item">文件管理</router-link>
      </nav>
    </aside>

    <!-- 应用模块侧边栏 -->
    <AppSidebar
      :groups="groups"
      :selected-group-id="selectedGroupId"
      @select-group="selectGroup"
      @create-group="() => openGroupModal('create')"
      @edit-group="onEditSelectedGroup"
      @delete-group="onDeleteSelectedGroup"
    />

    <!-- 主内容区 -->
    <main class="content-area">
      <div class="toolbar-row">
        <div class="left">
          <button
            class="btn btn-primary"
            @click="showCreateModal = true"
            title="新增自定义应用（上传图标并设置URL）"
          >
            新增应用
          </button>
          <button
            class="btn btn-primary btn-move btn-space"
            @click="showMoveModal = true"
            :disabled="selectedIds.length === 0"
            title="移动已选择的应用"
          >
            移动
          </button>
        </div>
        <div class="right">
          <input
            v-model="keyword"
            class="search"
            placeholder="搜索应用名称..."
          />
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="loading" class="loading">加载中...</div>

      <AppListTable
        v-if="!loading"
        :apps="filteredApps"
        :groups="groups"
        :all-selected="allSelected"
        v-model:selectedIds="selectedIds"
        @toggle-visible="onToggleVisible"
        @toggle-autostart="onToggleAutostart"
        @delete="remove"
        @update:all-selected="toggleAll"
      />

      <!-- 分页 -->
      <PaginationControls
        :page="page"
        :limit="limit"
        :total="total"
        @prev="prevPage"
        @next="nextPage"
        @limit-change="onLimitChange"
      />
    </main>

    <!-- 弹窗 -->
    <AppCreateModal
      v-model:show="showCreateModal"
      :group-id="selectedGroupId"
      @submit="submitCreate"
    />
    <AppGroupModal
      v-model:show="showGroupModal"
      :mode="groupModalMode"
      :group="editingGroup"
      @submit="submitGroup"
    />
    <AppMoveModal
      v-model:show="showMoveModal"
      :groups="groups"
      @submit="submitMove"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useApps } from '@/composables/useApps.js';
  import AppSidebar from '@/components/app/AppSidebar.vue';
  import PaginationControls from '@/components/common/PaginationControls.vue';
  import AppListTable from '@/components/app/AppListTable.vue';
  import AppCreateModal from '@/components/app/AppCreateModal.vue';
  import AppGroupModal from '@/components/app/AppGroupModal.vue';
  import AppMoveModal from '@/components/app/AppMoveModal.vue';

  const {
    apps,
    groups,
    loading,
    error,
    page,
    limit,
    total,
    fetchApps,
    fetchGroups,
    deleteApp,
    setVisible,
    setAutostart,
    createApp,
    createGroup,
    updateGroup,
    deleteGroup,
    moveApps,
  } = useApps();

  const keyword = ref('');
  const selectedGroupId = ref('');
  const selectedIds = ref([]);

  // 模态框状态
  const showCreateModal = ref(false);
  const showMoveModal = ref(false);
  const showGroupModal = ref(false);
  const groupModalMode = ref('create'); // 'create' | 'edit'
  const editingGroup = ref(null);

  const filteredApps = computed(() => {
    const k = (keyword.value || '').trim().toLowerCase();
    if (!k) return apps.value;
    return apps.value.filter(
      a =>
        (a.name || '').toLowerCase().includes(k) ||
        (a.slug || '').toLowerCase().includes(k)
    );
  });

  const allSelected = computed(
    () =>
      filteredApps.value.length > 0 &&
      selectedIds.value.length === filteredApps.value.length
  );

  function toggleAll(checked) {
    if (checked) {
      selectedIds.value = filteredApps.value.map(a => a.id);
    } else {
      selectedIds.value = [];
    }
  }

  async function reloadApps() {
    await fetchApps({ groupId: selectedGroupId.value || null }, true);
  }

  function selectGroup(id) {
    selectedGroupId.value = id === '' ? '' : Number(id);
    setPage(1);
    reloadApps();
  }

  function onEditSelectedGroup() {
    const g = groups.value.find(x => x.id === selectedGroupId.value);
    if (!g) return alert('未选择有效分组');
    openGroupModal('edit', g);
  }

  async function onDeleteSelectedGroup() {
    const g = groups.value.find(x => x.id === selectedGroupId.value);
    if (!g) return alert('未选择有效分组');
    if (!confirm(`确定删除分组 「${g.name}」？`)) return;
    try {
      await deleteGroup(g.id);
      if (selectedGroupId.value === g.id) selectGroup('');
    } catch (e) {
      alert(e?.message || '删除失败');
    }
  }

  async function remove(id) {
    await deleteApp(id);
    reloadApps();
  }

  async function onToggleVisible(app, checked) {
    await setVisible(app.id, checked);
    reloadApps();
  }

  async function onToggleAutostart(app, checked) {
    try {
      console.log('[AppManagement] onToggleAutostart', {
        id: app?.id,
        checked,
      });
      await setAutostart(app.id, checked);
      reloadApps();
    } catch (e) {
      console.error('[AppManagement] onToggleAutostart error', e);
      alert(e?.message || '设置自启动失败');
    }
  }

  // 分页控制
  const setPage = p => (page.value = p);
  const setLimit = l => (limit.value = l);

  async function prevPage() {
    if (page.value <= 1) return;
    setPage(page.value - 1);
    reloadApps();
  }
  async function nextPage() {
    const totalPages = Math.max(
      1,
      Math.ceil((total.value || 0) / (limit.value || 20))
    );
    if (page.value >= totalPages) return;
    setPage(page.value + 1);
    reloadApps();
  }
  async function onLimitChange(newLImit) {
    setPage(1);
    setLimit(newLImit);
    reloadApps();
  }

  onMounted(async () => {
    await Promise.all([fetchGroups(), fetchApps({}, true)]);
  });

  // 模态框逻辑
  function openGroupModal(mode = 'create', group = null) {
    groupModalMode.value = mode;
    editingGroup.value = group;
    showGroupModal.value = true;
  }

  async function submitGroup(form) {
    try {
      if (groupModalMode.value === 'create') {
        await createGroup({
          name: form.name.trim(),
          slug: form.slug?.trim() || undefined,
        });
      } else if (groupModalMode.value === 'edit' && editingGroup.value) {
        await updateGroup(editingGroup.value.id, {
          name: form.name.trim(),
          slug: form.slug?.trim() || undefined,
        });
      }
      showGroupModal.value = false;
    } catch (e) {
      alert(e?.message || '操作失败');
    }
  }

  async function submitMove(targetGroupId) {
    try {
      const ids = (selectedIds.value || []).map(i => Number(i));
      const gid = Number(targetGroupId);
      await moveApps(ids, gid);
      selectedIds.value = [];
      showMoveModal.value = false;
      reloadApps();
    } catch (e) {
      alert(e?.message || '移动失败');
    }
  }

  async function submitCreate(payload) {
    try {
      await createApp(payload);
      showCreateModal.value = false;
      reloadApps();
    } catch (e) {
      alert(e?.message || '创建失败');
    }
  }
</script>

<style scoped>
  /* 页面特有细节保留（与全局不冲突） */
  .btn-space {
    margin-left: 8px;
  }
  .btn-move {
    background: #6b21a8; /* 深紫色，与主色区分 */
    color: #fff;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
  }
  .btn-move:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
