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

    expect(apiFetch).toHaveBeenCalledWith('/myapps?');
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
});
