import { apiFetch } from '@/api/httpClient.js';
import { appsState } from '@/store/appsState.js';

const { apps, groups, loading, error, lastError, page, limit, total } =
  appsState;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function recordRequestError(requestError) {
  lastError.value = requestError;
  error.value = requestError?.message || String(requestError);
}

async function runWithRequestState(
  request,
  { resetError = false, trackLoading = false } = {}
) {
  try {
    if (trackLoading) {
      loading.value = true;
    }
    if (resetError) {
      error.value = '';
    }
    lastError.value = null;
    return await request();
  } catch (requestError) {
    recordRequestError(requestError);
    throw requestError;
  } finally {
    if (trackLoading) {
      loading.value = false;
    }
  }
}

async function requestJson(url, options) {
  const response =
    options === undefined ? await apiFetch(url) : await apiFetch(url, options);
  const json = await response.json();
  return { response, json };
}

async function requestJsonSafe(url, options) {
  const response =
    options === undefined ? await apiFetch(url) : await apiFetch(url, options);
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

function ensureOk(response, json, fallbackMessage) {
  if (!response.ok) {
    throw new Error(json?.message || fallbackMessage);
  }

  return json?.data;
}

function ensureOkWithData(response, json, fallbackMessage) {
  if (!response.ok || !json?.data) {
    throw new Error(json?.message || fallbackMessage);
  }

  return json.data;
}

function buildJsonRequestOptions(method, payload) {
  return {
    method,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  };
}

function buildAppsUrl(
  { groupId = null, visible = null } = {},
  withPagination = true
) {
  const params = new URLSearchParams();
  if (groupId) params.append('groupId', groupId);
  if (visible !== null && visible !== undefined) {
    params.append('visible', visible ? '1' : '0');
  }
  if (withPagination) {
    params.append('page', String(page.value));
    params.append('limit', String(limit.value));
  }

  const query = params.toString();
  return query ? `/apps?${query}` : '/apps';
}

async function fetchApps(
  { groupId = null, visible = null } = {},
  withPagination = true
) {
  return runWithRequestState(
    async () => {
      const { response, json } = await requestJson(
        buildAppsUrl({ groupId, visible }, withPagination)
      );
      const data = ensureOkWithData(response, json, '加载失败');

      if (withPagination && data.items) {
        apps.value = data.items;
        total.value = data.total || 0;
      } else {
        apps.value = data;
        total.value = data.length || 0;
      }
    },
    { resetError: true, trackLoading: true }
  );
}

async function fetchAppsList({ groupId = null, visible = null } = {}) {
  const { response, json } = await requestJson(
    buildAppsUrl({ groupId, visible }, false)
  );
  const data = ensureOkWithData(response, json, '加载失败');

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data.items) ? data.items : [];
}

async function fetchGroups() {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson('/apps/groups/all');
    groups.value = ensureOkWithData(response, json, '加载分组失败');
  });
}

// 分组操作
async function createGroup(payload) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(
      '/apps/groups',
      buildJsonRequestOptions('POST', payload)
    );
    const data = ensureOk(response, json, '创建分组失败');
    await fetchGroups();
    return data;
  });
}

async function updateGroup(id, payload) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(
      `/apps/groups/${id}`,
      buildJsonRequestOptions('PUT', payload)
    );
    const data = ensureOk(response, json, '更新分组失败');
    await fetchGroups();
    return data;
  });
}

async function deleteGroup(id) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(`/apps/groups/${id}`, {
      method: 'DELETE',
    });
    ensureOk(response, json, '删除分组失败');
    await fetchGroups();
    return true;
  });
}

async function createApp(payload) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(
      '/apps',
      buildJsonRequestOptions('POST', payload)
    );
    return ensureOk(response, json, '创建失败');
  });
}

async function updateApp(id, payload) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(
      `/apps/${id}`,
      buildJsonRequestOptions('PUT', payload)
    );
    return ensureOk(response, json, '更新失败');
  });
}

async function deleteApp(id) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(`/apps/${id}`, {
      method: 'DELETE',
    });
    ensureOk(response, json, '删除失败');
    return true;
  });
}

async function setVisible(id, visible) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(
      `/apps/${id}/visible`,
      buildJsonRequestOptions('PUT', { visible })
    );
    return ensureOk(response, json, '设置失败');
  });
}

async function setVisibleBulk(ids, visible) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(
      '/apps/bulk/visible',
      buildJsonRequestOptions('PUT', { ids, visible })
    );
    ensureOk(response, json, '批量设置失败');
    return true;
  });
}

async function setAutostart(id, autostart) {
  return runWithRequestState(
    async () => {
      if (id === undefined || id === null || id === '') {
        throw new Error('invalid id');
      }
      const url = `/apps/${encodeURIComponent(id)}/autostart`;
      const { response, json } = await requestJsonSafe(
        url,
        buildJsonRequestOptions('PUT', { isAutostart: !!autostart })
      );
      if (!response.ok) {
        const message = json?.message || `Request failed: ${response.status}`;
        const requestError = new Error(message);
        requestError.status = response.status;
        throw requestError;
      }
      return json.data;
    },
    { resetError: true }
  );
}

async function moveApps(ids, targetGroupId) {
  return runWithRequestState(async () => {
    const { response, json } = await requestJson(
      '/apps/move',
      buildJsonRequestOptions('PUT', { ids, targetGroupId })
    );

    ensureOk(response, json, '移动失败');
    return json?.data ?? true;
  });
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
    fetchAppsList,
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

export { resetAppsState } from '@/store/appsState.js';
