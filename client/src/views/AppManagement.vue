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
    />

    <!-- 主内容区（列表骨架） -->
    <main class="content-area">
      <div class="toolbar-row">
        <div class="left">
          <button
            class="btn btn-primary"
            disabled
            title="暂未开放，内部应用由我们手工实现"
          >
            新增应用
          </button>
          <button
            class="btn btn-secondary"
            :disabled="selectedIds.length === 0"
            @click="visibleBulk(true)"
          >
            设为可见
          </button>
          <button
            class="btn btn-secondary"
            :disabled="selectedIds.length === 0"
            @click="visibleBulk(false)"
          >
            设为隐藏
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

      <div class="app-list" v-if="!loading">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  @change="toggleAll($event)"
                  :checked="allSelected"
                />
              </th>
              <th>图标</th>
              <th>名称</th>
              <th>Slug</th>
              <th>分组</th>
              <th>可见</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="app in filteredApps" :key="app.id">
              <td>
                <input type="checkbox" :value="app.id" v-model="selectedIds" />
              </td>
              <td>
                <img
                  v-if="app.icon_filename"
                  :src="getAppIconUrl(app)"
                  alt="icon"
                  class="icon"
                />
                <span v-else class="icon placeholder">—</span>
              </td>
              <td>{{ app.name }}</td>
              <td>{{ app.slug }}</td>
              <td>{{ displayGroupName(app.group_id) }}</td>
              <td>
                <label class="switch">
                  <input
                    type="checkbox"
                    :checked="!!app.is_visible"
                    @change="onToggleVisible(app, $event.target.checked)"
                  />
                  <span class="slider"></span>
                </label>
              </td>
              <td>
                <button
                  class="btn btn-sm btn-secondary"
                  @click="/* 打开编辑 */ null"
                >
                  编辑
                </button>
                <button class="btn btn-sm btn-danger" @click="remove(app.id)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useApps } from '@/composables/useApps.js';
  import AppSidebar from '@/components/app/AppSidebar.vue';
  import PaginationControls from '@/components/common/PaginationControls.vue';

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
    setVisibleBulk,
    setPage,
    setLimit,
    getAppIconUrl,
  } = useApps();

  const keyword = ref('');
  const selectedGroupId = ref('');
  const selectedIds = ref([]);

  const filteredApps = computed(() => {
    const k = (keyword.value || '').trim().toLowerCase();
    return apps.value.filter(a => {
      const matchKeyword =
        !k ||
        (a.name || '').toLowerCase().includes(k) ||
        (a.slug || '').toLowerCase().includes(k);
      const matchGroup =
        !selectedGroupId.value || a.group_id === selectedGroupId.value;
      return matchKeyword && matchGroup;
    });
  });

  const allSelected = computed(
    () =>
      filteredApps.value.length > 0 &&
      selectedIds.value.length === filteredApps.value.length
  );

  function toggleAll(e) {
    if (e.target.checked) selectedIds.value = filteredApps.value.map(a => a.id);
    else selectedIds.value = [];
  }

  function selectGroup(id) {
    selectedGroupId.value = id;
    setPage(1);
    fetchApps({ groupId: id || null }, true);
  }

  function displayGroupName(groupId) {
    const g = groups.value.find(x => x.id === groupId);
    return g ? g.name : '';
  }

  async function visibleBulk(visible) {
    if (selectedIds.value.length === 0) return;
    await setVisibleBulk(selectedIds.value, visible);
    await fetchApps({ groupId: selectedGroupId.value || null }, true);
    selectedIds.value = [];
  }

  async function remove(id) {
    await deleteApp(id);
    await fetchApps({ groupId: selectedGroupId.value || null }, true);
  }

  async function onToggleVisible(app, checked) {
    await setVisible(app.id, checked);
    await fetchApps({ groupId: selectedGroupId.value || null }, true);
  }

  async function prevPage() {
    if (page.value <= 1) return;
    setPage(page.value - 1);
    await fetchApps({ groupId: selectedGroupId.value || null }, true);
  }
  async function nextPage() {
    const totalPages = Math.max(
      1,
      Math.ceil((total.value || 0) / (limit.value || 20))
    );
    if (page.value >= totalPages) return;
    setPage(page.value + 1);
    await fetchApps({ groupId: selectedGroupId.value || null }, true);
  }
  async function onLimitChange() {
    setPage(1);
    setLimit(limit.value);
    await fetchApps({ groupId: selectedGroupId.value || null }, true);
  }

  const totalPages = computed(() =>
    Math.max(1, Math.ceil((total.value || 0) / (limit.value || 20)))
  );

  onMounted(async () => {
    await Promise.all([fetchGroups(), fetchApps({}, true)]);
  });
</script>

<style scoped>
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

  .content-area {
    padding: 20px;
  }
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .search {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
  }
  .app-list table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
  }
  .app-list th,
  .app-list td {
    padding: 10px;
    border-bottom: 1px solid #eee;
    text-align: left;
  }
  .icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
  .icon.placeholder {
    display: inline-block;
    width: 32px;
    height: 32px;
    text-align: center;
    color: #888;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 0;
  }

  /* 开关样式 */
  .switch {
    position: relative;
    display: inline-block;
    width: 46px;
    height: 24px;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.2s;
    border-radius: 24px;
  }
  .slider:before {
    position: absolute;
    content: '';
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
  }
  .switch input:checked + .slider {
    background-color: #4caf50;
  }
  .switch input:checked + .slider:before {
    transform: translateX(22px);
  }
</style>
