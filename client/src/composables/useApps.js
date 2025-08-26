import { ref } from 'vue';

// Module-level state -> singleton across imports
const apps = ref([]);
const groups = ref([]);
const loading = ref(false);
const error = ref('');
const lastError = ref(null);

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
    lastError.value = null;
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (visible !== null && visible !== undefined)
      params.append('visible', visible ? '1' : '0');
    if (withPagination) {
      params.append('page', String(page.value));
      params.append('limit', String(limit.value));
    }
    const resp = await fetch(`/api/myapps?${params.toString()}`);
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
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  } finally {
    loading.value = false;
  }
}

async function fetchGroups() {
  try {
    lastError.value = null;
    const resp = await fetch('/api/myapps/groups/all');
    const json = await resp.json();
    if (resp.ok && json?.data) groups.value = json.data;
    else throw new Error(json?.message || '加载分组失败');
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

// 分组操作
async function createGroup(payload) {
  try {
    lastError.value = null;
    const resp = await fetch('/api/myapps/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '创建分组失败');
    // 刷新本地 groups
    await fetchGroups();
    return json.data;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function updateGroup(id, payload) {
  try {
    lastError.value = null;
    const resp = await fetch(`/api/myapps/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '更新分组失败');
    await fetchGroups();
    return json.data;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function deleteGroup(id) {
  try {
    lastError.value = null;
    const resp = await fetch(`/api/myapps/groups/${id}`, { method: 'DELETE' });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '删除分组失败');
    await fetchGroups();
    return true;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function createApp(payload) {
  try {
    lastError.value = null;
    const resp = await fetch('/api/myapps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '创建失败');
    return json.data;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function updateApp(id, payload) {
  try {
    lastError.value = null;
    const resp = await fetch(`/api/myapps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '更新失败');
    return json.data;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function deleteApp(id) {
  try {
    lastError.value = null;
    const resp = await fetch(`/api/myapps/${id}`, { method: 'DELETE' });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '删除失败');
    return true;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function setVisible(id, visible) {
  try {
    lastError.value = null;
    const resp = await fetch(`/api/myapps/${id}/visible`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '设置失败');
    return json.data;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function setVisibleBulk(ids, visible) {
  try {
    lastError.value = null;
    const resp = await fetch('/api/myapps/bulk/visible', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, visible }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '批量设置失败');
    return true;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function setAutostart(id, autostart) {
  try {
    lastError.value = null;
    // 统一使用更新端点，兼容后端是否存在单独 autostart 路由
    const resp = await fetch(`/api/myapps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_autostart: !!autostart }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || '设置失败');
    return json.data;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

async function moveApps(ids, targetGroupId) {
  try {
    lastError.value = null;
    console.log('useApps.moveApps request', { ids, targetGroupId });
    const resp = await fetch('/api/myapps/move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, targetGroupId }),
    });
    const json = await resp.json();
    console.log('useApps.moveApps response', resp.status, json);
    if (!resp.ok) throw new Error(json?.message || '移动失败');
    return json?.data ?? true;
  } catch (e) {
    lastError.value = e;
    error.value = e.message || String(e);
    throw e;
  }
}

function setPage(p) {
  page.value = p;
}
function setLimit(l) {
  limit.value = l;
}

export function getAppIconUrl(app) {
  const filename = app?.iconFilename || app?.icon_filename;
  if (!filename) return '';
  // 后端静态托管目录
  return `/uploads/apps/icons/${filename}`;
}

export function useApps() {
  return {
    apps,
    groups,
    loading,
    error,
    lastError,
    page,
    limit,
    total,
    fetchApps,
    fetchGroups,
    createApp,
    updateApp,
    deleteApp,
    createGroup,
    updateGroup,
    deleteGroup,
    setVisible,
    setVisibleBulk,
    setAutostart,
    moveApps,
    setPage,
    setLimit,
    getAppIconUrl,
  };
}
