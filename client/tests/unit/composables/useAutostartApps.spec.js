import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('@/composables/useApps.js', () => ({
  useApps: vi.fn(),
}));
vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: vi.fn(),
}));
vi.mock('@/apps/registry.js', () => ({
  getAppComponentBySlug: vi.fn(),
  getAppMetaBySlug: vi.fn(),
}));

import useAutostartApps from '@/composables/useAutostartApps.js';
import { useApps } from '@/composables/useApps.js';
import { useWindowManager } from '@/composables/useWindowManager.js';
import { getAppComponentBySlug, getAppMetaBySlug } from '@/apps/registry.js';

describe('useAutostartApps', () => {
  let fetchAppsListMock;
  let createWindowMock;
  let findWindowByAppMock;
  let setActiveWindowMock;
  let wrapper = null;

  const Harness = defineComponent({
    setup() {
      useAutostartApps();
      return () => null;
    },
  });

  const mountAutostart = () => {
    wrapper = mount(Harness);
    return flushPromises();
  };

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    fetchAppsListMock = vi.fn().mockResolvedValue([]);
    useApps.mockReturnValue({ fetchAppsList: fetchAppsListMock });

    createWindowMock = vi.fn(payload => ({ id: 1, ...payload }));
    findWindowByAppMock = vi.fn(() => null);
    setActiveWindowMock = vi.fn();
    useWindowManager.mockReturnValue({
      createWindow: createWindowMock,
      findWindowByApp: findWindowByAppMock,
      setActiveWindow: setActiveWindowMock,
    });

    getAppComponentBySlug.mockImplementation(slug => ({ comp: slug }));
    getAppMetaBySlug.mockImplementation(slug => ({
      name: `Meta ${slug}`,
      preferredSize: { width: 640, height: 480 },
    }));
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('挂载后以 { visible: true } 拉取应用列表', async () => {
    await mountAutostart();
    expect(fetchAppsListMock).toHaveBeenCalledWith({ visible: true });
  });

  it('只为自启动应用创建窗口，携带注册表组件与首选尺寸', async () => {
    fetchAppsListMock.mockResolvedValue([
      { slug: 'notes', name: 'Notes', isAutostart: 1 },
      { slug: 'other', name: 'Other', isAutostart: 0 },
    ]);

    await mountAutostart();

    expect(createWindowMock).toHaveBeenCalledTimes(1);
    expect(createWindowMock).toHaveBeenCalledWith({
      component: { comp: 'notes' },
      title: 'Meta notes',
      appSlug: 'notes',
      width: 640,
      height: 480,
      props: {},
    });
  });

  it('isAutostart 为布尔 true 同样命中过滤条件', async () => {
    fetchAppsListMock.mockResolvedValue([
      { slug: 'a', name: 'A', isAutostart: true },
    ]);

    await mountAutostart();
    expect(createWindowMock).toHaveBeenCalledTimes(1);
  });

  it('没有任何自启动应用时不创建窗口', async () => {
    fetchAppsListMock.mockResolvedValue([
      { slug: 'a', isAutostart: 0 },
      { slug: 'b' },
    ]);

    await mountAutostart();
    expect(createWindowMock).not.toHaveBeenCalled();
  });

  it('targetUrl 应用改用 window.open 新窗口打开，不走窗口管理器', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    fetchAppsListMock.mockResolvedValue([
      {
        slug: 'web',
        name: 'Web',
        targetUrl: 'https://example.com',
        isAutostart: 1,
      },
      { slug: 'notes', name: 'Notes', isAutostart: 1 },
    ]);

    await mountAutostart();

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );
    expect(createWindowMock).toHaveBeenCalledTimes(1);
    expect(createWindowMock.mock.calls[0][0].appSlug).toBe('notes');
  });

  it('window.open 被拦截抛错时告警并继续处理后续应用', async () => {
    vi.spyOn(window, 'open').mockImplementation(() => {
      throw new Error('popup blocked');
    });
    fetchAppsListMock.mockResolvedValue([
      {
        slug: 'web',
        name: 'Web',
        targetUrl: 'https://example.com',
        isAutostart: 1,
      },
      { slug: 'notes', name: 'Notes', isAutostart: 1 },
    ]);

    await mountAutostart();

    expect(
      vi
        .mocked(console.warn)
        .mock.calls.some(args =>
          args.some(a => String(a).includes('open autostart url failed'))
        )
    ).toBe(true);
    // 后续应用不受影响
    expect(createWindowMock).toHaveBeenCalledTimes(1);
    expect(createWindowMock.mock.calls[0][0].appSlug).toBe('notes');
  });

  it('已有同应用窗口时复用并激活，不重复创建', async () => {
    findWindowByAppMock.mockImplementation(slug =>
      slug === 'notes' ? { id: 7, props: null } : null
    );
    fetchAppsListMock.mockResolvedValue([
      { slug: 'notes', name: 'Notes', isAutostart: 1 },
    ]);

    await mountAutostart();

    expect(findWindowByAppMock).toHaveBeenCalledWith('notes');
    expect(setActiveWindowMock).toHaveBeenCalledWith(7);
    expect(createWindowMock).not.toHaveBeenCalled();
  });

  it('复用 work-timer 窗口时注入 autoStart 标记', async () => {
    const existing = { id: 9, props: null };
    findWindowByAppMock.mockReturnValue(existing);
    fetchAppsListMock.mockResolvedValue([
      { slug: 'work-timer', name: 'WorkTimer', isAutostart: 1 },
    ]);

    await mountAutostart();

    expect(setActiveWindowMock).toHaveBeenCalledWith(9);
    expect(existing.props.autoStart).toBe(true);
  });

  it('复用非 work-timer 窗口时不注入 autoStart', async () => {
    const existing = { id: 5, props: {} };
    findWindowByAppMock.mockReturnValue(existing);
    fetchAppsListMock.mockResolvedValue([
      { slug: 'notes', name: 'Notes', isAutostart: 1 },
    ]);

    await mountAutostart();
    expect(existing.props.autoStart).toBeUndefined();
  });

  it('注册表中无对应组件时告警并跳过该应用', async () => {
    getAppComponentBySlug.mockReturnValue(null);
    fetchAppsListMock.mockResolvedValue([
      { slug: 'ghost', name: 'Ghost', isAutostart: 1 },
    ]);

    await mountAutostart();

    expect(createWindowMock).not.toHaveBeenCalled();
    expect(
      vi
        .mocked(console.warn)
        .mock.calls.some(args =>
          args.some(
            a => typeof a === 'object' && a !== null && a.slug === 'ghost'
          )
        )
    ).toBe(true);
  });

  it('meta 缺失时回退到应用名与默认窗口尺寸 520x400', async () => {
    getAppMetaBySlug.mockReturnValue(null);
    fetchAppsListMock.mockResolvedValue([
      { slug: 'plain', name: 'My App', isAutostart: 1 },
    ]);

    await mountAutostart();

    expect(createWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My App',
        width: 520,
        height: 400,
        props: {},
      })
    );
  });

  it('应用列表拉取失败时告警且不抛出、不创建窗口', async () => {
    fetchAppsListMock.mockRejectedValue(new Error('network error'));

    await mountAutostart();

    expect(createWindowMock).not.toHaveBeenCalled();
    expect(
      vi
        .mocked(console.warn)
        .mock.calls.some(args =>
          args.some(a => String(a).includes('fetch autostart apps failed'))
        )
    ).toBe(true);
  });

  it('单个应用创建失败不影响后续应用的启动', async () => {
    createWindowMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    fetchAppsListMock.mockResolvedValue([
      { slug: 'first', name: 'First', isAutostart: 1 },
      { slug: 'second', name: 'Second', isAutostart: 1 },
    ]);

    await mountAutostart();

    expect(createWindowMock).toHaveBeenCalledTimes(2);
    expect(createWindowMock.mock.calls[1][0].appSlug).toBe('second');
    expect(
      vi
        .mocked(console.warn)
        .mock.calls.some(args =>
          args.some(a => String(a).includes('start autostart app failed'))
        )
    ).toBe(true);
  });
});
