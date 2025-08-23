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
            @click="openCreateModal"
            title="新增自定义应用（上传图标并设置URL）"
          >
            新增应用
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
                <button
                  class="btn btn-sm btn-danger"
                  :disabled="app.is_builtin === 1 || app.is_builtin === true"
                  :title="app.is_builtin ? '内置应用不可删除' : '删除'"
                  @click="!app.is_builtin && remove(app.id)"
                >
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
    <!-- 新增自定义应用弹窗 -->
    <div v-if="showCreate" class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div class="title">新增自定义应用</div>
          <button class="close" @click="showCreate = false">✖</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>名称</label>
            <input v-model="createForm.name" placeholder="例如：Google" />
          </div>
          <div class="form-row">
            <label>Slug</label>
            <input v-model="createForm.slug" placeholder="例如：google" />
          </div>
          <div class="form-row">
            <label>URL</label>
            <input
              v-model="createForm.target_url"
              placeholder="https://example.com"
            />
          </div>
          <div class="form-row">
            <label>图标</label>
            <input type="file" accept="image/*" @change="onIconSelected" />
            <div v-if="createForm.icon_filename" class="preview">
              <img :src="`/uploads/apps/icons/${createForm.icon_filename}`" />
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" @click="submitCreate">创建</button>
            <button class="btn" @click="showCreate = false">取消</button>
          </div>
        </div>
      </div>
    </div>
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

  const showCreate = ref(false);
  const createForm = ref({
    name: '',
    slug: '',
    target_url: '',
    icon_filename: null,
    group_id: null,
    is_visible: true,
  });

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

  // 新增自定义APP
  function openCreateModal() {
    showCreate.value = true;
  }
  async function submitCreate() {
    try {
      const payload = {
        name: createForm.value.name.trim(),
        slug: createForm.value.slug.trim(),
        target_url: createForm.value.target_url.trim() || null,
        icon_filename: createForm.value.icon_filename || null,
        group_id: selectedGroupId.value || null,
        is_visible: !!createForm.value.is_visible,
      };
      // 简要校验
      if (!payload.name || !payload.slug) {
        alert('请填写名称与slug');
        return;
      }
      if (!payload.target_url) {
        alert('请填写URL');
        return;
      }
      await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showCreate.value = false;
      await fetchApps({ groupId: selectedGroupId.value || null }, true);
      // 重置
      createForm.value = {
        name: '',
        slug: '',
        target_url: '',
        icon_filename: null,
        group_id: null,
        is_visible: true,
      };
    } catch (e) {
      alert(e?.message || '创建失败');
    }
  }

  // 图标上传（到 /api/apps/icons/upload）
  async function onIconSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch('/api/apps/icons/upload', {
      method: 'POST',
      body: form,
    });
    const json = await resp.json();
    if (resp.ok && json?.data?.filename) {
      createForm.value.icon_filename = json.data.filename;
    } else {
      alert(json?.message || '上传失败');
    }
  }
</script>

<style scoped>
  /* 页面特有细节保留（与全局不冲突） */
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
</style>

<style scoped>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: #fff;
    width: 520px;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
  }
  .modal-body {
    padding: 12px;
  }
  .title {
    font-weight: 600;
  }
  .close {
    background: none;
    border: none;
    cursor: pointer;
  }
  .form-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
  }
  .form-row label {
    width: 72px;
    text-align: right;
    color: #555;
  }
  .form-row input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
  }
  .preview img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border: 1px dashed #ddd;
    border-radius: 8px;
    padding: 4px;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
