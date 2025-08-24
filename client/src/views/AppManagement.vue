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
          <button
            class="btn btn-secondary"
            @click="openMoveModal"
            :disabled="selectedIds.length === 0"
            title="移动已选择的应用"
          >
            移动
          </button>
          <template v-if="showGroupActions">
            <button class="btn btn-outline" @click="onEditSelectedGroup">
              编辑分组
            </button>
            <button
              class="btn btn-outline btn-danger"
              @click="onDeleteSelectedGroup"
            >
              删除分组
            </button>
          </template>
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
              <th>类型</th>
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
              <td>
                {{ (app.isBuiltin ?? app.is_builtin) ? '内置' : '第三方' }}
              </td>
              <td>{{ displayGroupName(app.groupId || app.group_id) }}</td>
              <td>
                <label class="switch">
                  <input
                    type="checkbox"
                    :checked="!!(app.isVisible ?? app.is_visible)"
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
                  :disabled="
                    (app.isBuiltin ?? app.is_builtin) === 1 ||
                    (app.isBuiltin ?? app.is_builtin) === true
                  "
                  :title="
                    (app.isBuiltin ?? app.is_builtin)
                      ? '内置应用不可删除'
                      : '删除'
                  "
                  @click="!(app.isBuiltin ?? app.is_builtin) && remove(app.id)"
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
    <!-- 分组管理模态 -->
    <div v-if="showGroupModal" class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div class="title">
            {{ groupModalMode === 'create' ? '新建分组' : '编辑分组' }}
          </div>
          <button class="close" @click="showGroupModal = false">✖</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>名称</label>
            <input v-model="groupForm.name" placeholder="例如：办公" />
          </div>
          <div class="form-row">
            <label>Slug</label>
            <input v-model="groupForm.slug" placeholder="例如：office" />
          </div>
          <div class="actions">
            <button class="btn btn-primary" @click="submitGroup">保存</button>
            <button class="btn" @click="showGroupModal = false">取消</button>
          </div>
        </div>
      </div>
    </div>
    <!-- 移动模态 -->
    <div v-if="showMoveModal" class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div class="title">移动应用到分组</div>
          <button class="close" @click="showMoveModal = false">✖</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>目标分组</label>
            <select v-model="moveTargetGroupId">
              <option :value="null">请选择分组</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </div>
          <div class="actions">
            <button class="btn btn-primary" @click="submitMove">移动</button>
            <button class="btn" @click="showMoveModal = false">取消</button>
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
    createApp,
    createGroup,
    updateGroup,
    deleteGroup,
    moveApps,
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
  // 移动操作
  const showMoveModal = ref(false);
  const moveTargetGroupId = ref(null);
  // 分组管理模态
  const showGroupModal = ref(false);
  const groupModalMode = ref('create'); // 'create' | 'edit'
  const editingGroup = ref(null);
  const groupForm = ref({ name: '', slug: '' });

  const filteredApps = computed(() => {
    const k = (keyword.value || '').trim().toLowerCase();
    return apps.value.filter(a => {
      const matchKeyword =
        !k ||
        (a.name || '').toLowerCase().includes(k) ||
        (a.slug || '').toLowerCase().includes(k);
      // normalize group id comparison to avoid string/number mismatch
      const appGroupId = Number(a.group_id ?? a.groupId ?? 0) || 0;
      const sel =
        selectedGroupId.value === '' ? null : Number(selectedGroupId.value);
      const matchGroup = !sel || appGroupId === sel;
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
    selectedGroupId.value = id === '' ? '' : Number(id);
    setPage(1);
    fetchApps({ groupId: id || null }, true);
  }

  // 侧栏选中一个分组后，显示编辑/删除按钮在页面顶部供用户操作
  const showGroupActions = computed(
    () => selectedGroupId.value !== '' && selectedGroupId.value !== null
  );
  function onEditSelectedGroup() {
    const g = groups.value.find(x => x.id === selectedGroupId.value);
    if (!g) return alert('未选择有效分组');
    openGroupModal('edit', g);
  }
  async function onDeleteSelectedGroup() {
    const g = groups.value.find(x => x.id === selectedGroupId.value);
    if (!g) return alert('未选择有效分组');
    await confirmDeleteGroup(g);
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

  function openGroupModal(mode = 'create', group = null) {
    groupModalMode.value = mode;
    if (mode === 'edit' && group) {
      editingGroup.value = group;
      groupForm.value = { name: group.name || '', slug: group.slug || '' };
    } else {
      editingGroup.value = null;
      groupForm.value = { name: '', slug: '' };
    }
    showGroupModal.value = true;
  }

  async function submitGroup() {
    try {
      if (!groupForm.value.name || !groupForm.value.name.trim()) {
        alert('请填写分组名称');
        return;
      }
      if (groupModalMode.value === 'create') {
        await createGroup({
          name: groupForm.value.name.trim(),
          slug: groupForm.value.slug?.trim() || undefined,
        });
      } else if (groupModalMode.value === 'edit' && editingGroup.value) {
        await updateGroup(editingGroup.value.id, {
          name: groupForm.value.name.trim(),
          slug: groupForm.value.slug?.trim() || undefined,
        });
      }
      showGroupModal.value = false;
    } catch (e) {
      alert(e?.message || '操作失败');
    }
  }

  async function confirmDeleteGroup(group) {
    if (!confirm(`确定删除分组 「${group.name}」？`)) return;
    try {
      await deleteGroup(group.id);
      // 如果当前选中该分组，切回全部
      if (selectedGroupId.value === group.id) selectGroup('');
    } catch (e) {
      alert(e?.message || '删除失败');
    }
  }

  function openMoveModal() {
    if (!selectedIds.value || selectedIds.value.length === 0) return;
    moveTargetGroupId.value = null;
    showMoveModal.value = true;
  }

  async function submitMove() {
    try {
      console.log('submitMove called', {
        selected: selectedIds.value,
        target: moveTargetGroupId.value,
      });
      if (!moveTargetGroupId.value) {
        alert('请选择目标分组');
        return;
      }
      // ensure numeric ids
      const ids = (selectedIds.value || []).map(i => Number(i));
      const gid = Number(moveTargetGroupId.value);
      console.log('calling moveApps', { ids, targetGroupId: gid });
      await moveApps(ids, gid);
      console.log('moveApps completed');
      // 刷新列表并清空选择
      selectedIds.value = [];
      showMoveModal.value = false;
      await fetchApps({ groupId: selectedGroupId.value || null }, true);
    } catch (e) {
      console.error('submitMove error', e);
      alert(e?.message || '移动失败');
    }
  }

  // 新增自定义APP
  function openCreateModal() {
    showCreate.value = true;
  }
  async function submitCreate() {
    try {
      const payload = {
        name: createForm.value.name.trim(),
        slug: createForm.value.slug.trim(),
        target_url:
          createForm.value.target_url?.trim() ||
          createForm.value.targetUrl?.trim() ||
          null,
        icon_filename:
          createForm.value.icon_filename ||
          createForm.value.iconFilename ||
          null,
        group_id:
          selectedGroupId.value ||
          createForm.value.group_id ||
          createForm.value.groupId ||
          null,
        is_visible: !!(
          createForm.value.is_visible ?? createForm.value.isVisible
        ),
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
      const created = await createApp(payload);
      // 保证界面立即显示新建的应用（若后端返回对象）
      if (created && created.id) {
        apps.value = [created, ...(apps.value || [])];
      }
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
