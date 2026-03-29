import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/httpClient.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/api/httpClient.js';

let useApps;
let getAppIconUrl;
let state;

describe('useApps composable', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    const module = await import('@/composables/useApps.js');
    useApps = module.useApps;
    getAppIconUrl = module.getAppIconUrl;
    state = useApps();

    state.apps.value = [];
    state.groups.value = [];
    state.loading.value = false;
    state.error.value = '';
    state.lastError.value = null;
    state.page.value = 1;
    state.limit.value = 20;
    state.total.value = 0;
  });

  it('fetchApps populates paginated results on success', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            { id: 1, name: 'App One' },
            { id: 2, name: 'App Two' },
          ],
          total: 8,
        },
      }),
    });

    await state.fetchApps();

    expect(apiFetch).toHaveBeenCalledWith('/myapps?page=1&limit=20');
    expect(state.apps.value.map(app => app.name)).toEqual([
      'App One',
      'App Two',
    ]);
    expect(state.total.value).toBe(8);
    expect(state.loading.value).toBe(false);
    expect(state.error.value).toBe('');
    expect(state.lastError.value).toBeNull();
  });

  it('fetchApps without pagination stores raw array and throws on API error', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
    });
    await state.fetchApps({}, false);

    expect(apiFetch).toHaveBeenCalledWith('/myapps');
    expect(state.apps.value).toHaveLength(3);
    expect(state.total.value).toBe(3);

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '加载失败' }),
    });

    await expect(state.fetchApps()).rejects.toThrow('加载失败');
    expect(state.loading.value).toBe(false);
    expect(state.error.value).toBe('加载失败');
    expect(state.lastError.value).toBeInstanceOf(Error);
  });

  it('fetchAppsList returns unpaginated list without mutating shared state', async () => {
    state.apps.value = [{ id: 99, name: 'Existing App' }];
    state.total.value = 1;

    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 1, name: 'Desktop App' },
          { id: 2, name: 'Autostart App' },
        ],
      }),
    });

    const result = await state.fetchAppsList({ visible: true });

    expect(apiFetch).toHaveBeenCalledWith('/myapps?visible=1');
    expect(result.map(app => app.name)).toEqual([
      'Desktop App',
      'Autostart App',
    ]);
    expect(state.apps.value).toEqual([{ id: 99, name: 'Existing App' }]);
    expect(state.total.value).toBe(1);
  });

  it('fetchAppsList handles paginated payload and error payload', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          items: [{ id: 1, name: 'Only Item' }],
          total: 1,
        },
      }),
    });

    await expect(state.fetchAppsList({ groupId: 'g1' })).resolves.toEqual([
      { id: 1, name: 'Only Item' },
    ]);
    expect(apiFetch).toHaveBeenCalledWith('/myapps?groupId=g1');

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '列表加载失败' }),
    });

    await expect(state.fetchAppsList()).rejects.toThrow('列表加载失败');
  });

  it('fetchGroups success and error branches', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'default', name: '默认分组' }] }),
    });

    await state.fetchGroups();
    expect(apiFetch).toHaveBeenCalledWith('/myapps/groups/all');
    expect(state.groups.value).toEqual([{ id: 'default', name: '默认分组' }]);

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '加载分组失败-后端' }),
    });

    await expect(state.fetchGroups()).rejects.toThrow('加载分组失败-后端');
    expect(state.error.value).toBe('加载分组失败-后端');
    expect(state.lastError.value).toBeInstanceOf(Error);
  });

  it('createGroup refreshes groups and returns created data', async () => {
    const created = { id: 'g2', name: '新分组' };
    apiFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: created }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [created] }),
      });

    const result = await state.createGroup({ name: '新分组' });
    expect(result).toEqual(created);
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/myapps/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '新分组' }),
    });
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/myapps/groups/all');

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '创建分组失败-后端' }),
    });
    await expect(state.createGroup({ name: '坏请求' })).rejects.toThrow(
      '创建分组失败-后端'
    );
  });

  it('updateGroup and deleteGroup cover success and failure', async () => {
    apiFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'g3', name: '改名后' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'g3', name: '改名后' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

    await expect(state.updateGroup('g3', { name: '改名后' })).resolves.toEqual({
      id: 'g3',
      name: '改名后',
    });
    await expect(state.deleteGroup('g3')).resolves.toBe(true);

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '更新分组失败-后端' }),
    });
    await expect(state.updateGroup('g4', { name: 'x' })).rejects.toThrow(
      '更新分组失败-后端'
    );

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '删除分组失败-后端' }),
    });
    await expect(state.deleteGroup('g4')).rejects.toThrow('删除分组失败-后端');
  });

  it('createApp deleteApp setVisible setVisibleBulk moveApps cover key branches', async () => {
    apiFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1, name: 'new app' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1, visible: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { moved: 2 } }),
      });

    await expect(state.createApp({ name: 'new app' })).resolves.toEqual({
      id: 1,
      name: 'new app',
    });
    await expect(state.deleteApp(1)).resolves.toBe(true);
    await expect(state.setVisible(1, true)).resolves.toEqual({
      id: 1,
      visible: true,
    });
    await expect(state.setVisibleBulk([1, 2], false)).resolves.toBe(true);
    await expect(state.moveApps([1, 2], 'g2')).resolves.toEqual({ moved: 2 });

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '创建失败-后端' }),
    });
    await expect(state.createApp({ name: 'bad' })).rejects.toThrow(
      '创建失败-后端'
    );

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '删除失败-后端' }),
    });
    await expect(state.deleteApp(2)).rejects.toThrow('删除失败-后端');

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '设置失败-后端' }),
    });
    await expect(state.setVisible(2, false)).rejects.toThrow('设置失败-后端');

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '批量设置失败-后端' }),
    });
    await expect(state.setVisibleBulk([2], true)).rejects.toThrow(
      '批量设置失败-后端'
    );

    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '移动失败-后端' }),
    });
    await expect(state.moveApps([2], 'g1')).rejects.toThrow('移动失败-后端');
  });

  it('setPage and setLimit update pagination refs', () => {
    state.setPage(3);
    state.setLimit(50);

    expect(state.page.value).toBe(3);
    expect(state.limit.value).toBe(50);
  });

  it('setAutostart validates id, forwards request and surfaces backend errors', async () => {
    await expect(state.setAutostart('', true)).rejects.toThrow('invalid id');
    expect(state.error.value).toBe('invalid id');

    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server boom' }),
    });

    await expect(state.setAutostart('test-app', true)).rejects.toThrow(
      'Server boom'
    );
    expect(apiFetch).toHaveBeenCalledWith('/myapps/test-app/autostart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_autostart: true }),
    });

    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'app-2', is_autostart: false } }),
    });

    const result = await state.setAutostart('app-2', false);
    expect(result).toEqual({ id: 'app-2', is_autostart: false });
    expect(state.error.value).toBe('');
    expect(state.lastError.value).toBeNull();
  });

  it('getAppIconUrl builds uploads path', () => {
    expect(getAppIconUrl({ iconFilename: 'icon.png' })).toBe(
      '/uploads/apps/icons/icon.png'
    );
    expect(getAppIconUrl({ icon_filename: 'legacy.svg' })).toBe(
      '/uploads/apps/icons/legacy.svg'
    );
    expect(getAppIconUrl({})).toBe('');
  });

  it('updateApp sends PUT request and returns updated app', async () => {
    const updatedApp = { id: 1, name: 'Updated App', slug: 'updated-app' };
    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedApp }),
    });

    const payload = { name: 'Updated App', target_url: 'https://example.com' };
    const result = await state.updateApp(1, payload);

    expect(apiFetch).toHaveBeenCalledWith('/myapps/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(updatedApp);
    expect(state.error.value).toBe('');
    expect(state.lastError.value).toBeNull();
  });

  it('updateApp handles errors for builtin apps', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: '内置应用不允许编辑' }),
    });

    await expect(
      state.updateApp(1, { name: 'Try to update builtin' })
    ).rejects.toThrow('内置应用不允许编辑');
    expect(state.error.value).toBe('内置应用不允许编辑');
    expect(state.lastError.value).toBeInstanceOf(Error);
  });

  it('setAutostart handles non-json error response and id encoding', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('invalid json');
      },
    });

    await expect(state.setAutostart('space id/1', true)).rejects.toThrow(
      'Request failed: 503'
    );
    expect(apiFetch).toHaveBeenCalledWith('/myapps/space%20id%2F1/autostart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_autostart: true }),
    });
  });
});
