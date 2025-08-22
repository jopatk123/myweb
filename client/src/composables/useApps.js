import { ref } from 'vue';

export function useApps() {
  const apps = ref([]);
  const groups = ref([]);
  const loading = ref(false);
  const error = ref('');

  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);

  async function fetchApps(
    { groupId = null, visible = null } = {},
    withPagination = true
  ) {
    try {
      loading.value = true;
      error.value = '';
      const params = new URLSearchParams();
      if (groupId) params.append('groupId', groupId);
      if (visible !== null && visible !== undefined)
        params.append('visible', visible ? '1' : '0');
      if (withPagination) {
        params.append('page', String(page.value));
        params.append('limit', String(limit.value));
      }
      const resp = await fetch(`/api/apps?${params.toString()}`);
      const json = await resp.json();
      if (resp.ok && json?.data) {
        if (withPagination && json.data.items) {
          apps.value = json.data.items;
          total.value = json.data.total || 0;
        } else {
          apps.value = json.data;
          total.value = json.data.length || 0;
        }
      } else {
        throw new Error(json?.message || '加载失败');
      }
    } catch (e) {
      error.value = e.message || String(e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchGroups() {
    try {
      const resp = await fetch('/api/apps/groups/all');
      const json = await resp.json();
      if (resp.ok && json?.data) groups.value = json.data;
      else throw new Error(json?.message || '加载分组失败');
    } catch (e) {
      error.value = e.message || String(e);
    }
  }

  async function createApp(payload) {
    const resp = await fetch('/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '创建失败');
    return json.data;
  }

  async function updateApp(id, payload) {
    const resp = await fetch(`/api/apps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '更新失败');
    return json.data;
  }

  async function deleteApp(id) {
    const resp = await fetch(`/api/apps/${id}`, { method: 'DELETE' });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '删除失败');
    return true;
  }

  async function setVisible(id, visible) {
    const resp = await fetch(`/api/apps/${id}/visible`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '设置失败');
    return json.data;
  }

  async function setVisibleBulk(ids, visible) {
    const resp = await fetch('/api/apps/bulk/visible', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, visible }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '批量设置失败');
    return true;
  }

  async function moveApps(ids, targetGroupId) {
    const resp = await fetch('/api/apps/move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, targetGroupId }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '移动失败');
    return true;
  }

  function setPage(p) {
    page.value = p;
  }
  function setLimit(l) {
    limit.value = l;
  }

  function getAppIconUrl(app) {
    if (!app?.icon_filename) return '';
    // 后端静态托管目录
    return `/uploads/apps/icons/${app.icon_filename}`;
  }

  return {
    apps,
    groups,
    loading,
    error,
    page,
    limit,
    total,
    fetchApps,
    fetchGroups,
    createApp,
    updateApp,
    deleteApp,
    setVisible,
    setVisibleBulk,
    moveApps,
    setPage,
    setLimit,
    getAppIconUrl,
  };
}
