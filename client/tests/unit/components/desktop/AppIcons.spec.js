import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import AppIcons from '@/components/desktop/AppIcons.vue';

const NamedContextMenuStub = defineComponent({
  name: 'ContextMenuStub',
  props: ['modelValue', 'x', 'y', 'items'],
  emits: ['select', 'update:modelValue'],
  template: '<div class="context-menu-stub" />',
});

const mountAppIcons = async ({ apps = [], component = null } = {}) => {
  const { useApps } = await import('@/composables/useApps.js');
  const fetchAppsList = vi.fn(async () => apps);
  const getAppIconUrl = vi.fn(app => `/icons/${app.iconFilename}`);
  const setVisible = vi.fn();
  useApps.mockReturnValue({ fetchAppsList, getAppIconUrl, setVisible });

  const { getAppComponentBySlug } = await import('@/apps/registry.js');
  getAppComponentBySlug.mockReturnValue(component);

  const wrapper = mount(AppIcons, {
    global: {
      stubs: {
        ContextMenu: NamedContextMenuStub,
      },
    },
  });
  await nextTick();
  await flushPromises();
  await nextTick();
  return {
    wrapper,
    fetchAppsList,
    getAppIconUrl,
    setVisible,
    getAppComponentBySlug,
  };
};

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock composables
vi.mock('@/composables/useApps.js', () => ({
  useApps: vi.fn(() => ({
    fetchAppsList: vi.fn(async () => []),
    getAppIconUrl: vi.fn(app => app.iconFilename || '/apps/icons/file-128.svg'),
    setVisible: vi.fn(),
  })),
}));

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: vi.fn(() => ({
    createWindow: vi.fn(),
    findWindowByApp: vi.fn(),
    setActiveWindow: vi.fn(),
  })),
}));

vi.mock('@/composables/useDesktopGrid.js', () => ({
  default: vi.fn(() => ({
    GRID: { cellWidth: 88, cellHeight: 88, maxRows: 8 },
    cellToPosition: vi.fn(({ col, row }) => ({ x: col * 88, y: row * 88 })),
    finalizeDragForPositions: vi.fn(),
    savePositionsToStorage: vi.fn(),
    loadPositionsFromStorage: vi.fn(() => ({})),
  })),
}));

vi.mock('@/apps/registry.js', () => ({
  getAppComponentBySlug: vi.fn(),
  getAppMetaBySlug: vi.fn(() => ({
    name: 'Test App',
    preferredSize: { width: 520, height: 400 },
  })),
}));

describe('AppIcons', () => {
  let wrapper;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('右键菜单功能', () => {
    it('挂载时应读取未分页的桌面应用列表', async () => {
      const mockApps = Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        name: `App ${index + 1}`,
        slug: `app-${index + 1}`,
        isVisible: true,
      }));

      const fetchAppsList = vi.fn(async () => mockApps);
      const { useApps } = await import('@/composables/useApps.js');
      useApps.mockReturnValue({
        fetchAppsList,
        getAppIconUrl: vi.fn(() => '/apps/icons/test.svg'),
        setVisible: vi.fn(),
      });

      wrapper = mount(AppIcons, {
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
          },
        },
      });

      await nextTick();
      await flushPromises();
      await nextTick();

      expect(fetchAppsList).toHaveBeenCalledWith({ visible: true });
      expect(wrapper.findAll('.icon-item')).toHaveLength(25);
    });

    it('右键点击图标应该显示菜单但不触发拖动', async () => {
      const mockApps = [
        { id: 1, name: 'Test App', slug: 'test-app', isVisible: true },
      ];

      const { useApps } = await import('@/composables/useApps.js');
      useApps.mockReturnValue({
        fetchAppsList: vi.fn(async () => mockApps),
        getAppIconUrl: vi.fn(() => '/apps/icons/test.svg'),
        setVisible: vi.fn(),
      });

      wrapper = mount(AppIcons, {
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
          },
        },
      });

      await nextTick();
      await flushPromises();
      await nextTick();

      const iconItem = wrapper.find('.icon-item');
      expect(iconItem.exists()).toBe(true);

      // 模拟右键点击事件 (button = 2 表示右键)
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      // 添加计时器 spy
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // 触发右键按下
      await iconItem.element.dispatchEvent(mouseDownEvent);
      await nextTick();

      // 触发右键菜单
      await iconItem.trigger('contextmenu', { clientX: 100, clientY: 100 });
      await nextTick();

      // 验证：右键点击不应该启动拖动定时器
      // 因为 onMouseDown 在检测到 e.button === 2 时会直接返回
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it('左键点击图标应该可以触发拖动', async () => {
      const mockApps = [
        { id: 1, name: 'Test App', slug: 'test-app', isVisible: true },
      ];

      const { useApps } = await import('@/composables/useApps.js');
      useApps.mockReturnValue({
        fetchAppsList: vi.fn(async () => mockApps),
        getAppIconUrl: vi.fn(() => '/apps/icons/test.svg'),
        setVisible: vi.fn(),
      });

      wrapper = mount(AppIcons, {
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
          },
        },
      });

      await nextTick();
      await flushPromises();
      await nextTick();

      const iconItem = wrapper.find('.icon-item');
      expect(iconItem.exists()).toBe(true);

      // 模拟左键点击事件 (button = 0 表示左键)
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // 触发左键按下
      await iconItem.element.dispatchEvent(mouseDownEvent);
      await nextTick();

      // 验证：左键点击应该启动拖动定时器（150ms后触发拖动）
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 150);

      setTimeoutSpy.mockRestore();
    });

    it('右键点击后释放鼠标不应该启动拖动监听器', async () => {
      const mockApps = [
        { id: 1, name: 'Test App', slug: 'test-app', isVisible: true },
      ];

      const { useApps } = await import('@/composables/useApps.js');
      useApps.mockReturnValue({
        fetchAppsList: vi.fn(async () => mockApps),
        getAppIconUrl: vi.fn(() => '/apps/icons/test.svg'),
        setVisible: vi.fn(),
      });

      wrapper = mount(AppIcons, {
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
          },
        },
      });

      await nextTick();
      await flushPromises();
      await nextTick();

      const iconItem = wrapper.find('.icon-item');

      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      // 模拟右键点击
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      await iconItem.element.dispatchEvent(mouseDownEvent);
      await nextTick();

      // 模拟松开鼠标
      const mouseUpEvent = new MouseEvent('mouseup', {
        button: 2,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      document.dispatchEvent(mouseUpEvent);
      await nextTick();

      // 验证：不应该添加 mousemove 监听器
      const mouseMoveListenerAdded = addEventListenerSpy.mock.calls.some(
        call => call[0] === 'mousemove'
      );
      expect(mouseMoveListenerAdded).toBe(false);

      addEventListenerSpy.mockRestore();
    });
  });

  describe('图标渲染与打开行为', () => {
    afterEach(() => {
      if (wrapper) {
        wrapper.unmount();
        wrapper = null;
      }
    });

    it('icon url falls back: custom filename -> builtin slug -> default icon', async () => {
      const apps = [
        {
          id: 1,
          name: '自定义',
          slug: 'custom',
          iconFilename: 'x.png',
          isVisible: true,
        },
        { id: 2, name: '计算器', slug: 'calculator', isVisible: true },
        { id: 3, name: '未知', slug: 'nope', isVisible: true },
      ];

      const { wrapper: vm, getAppIconUrl } = await mountAppIcons({ apps });
      wrapper = vm;

      const srcs = wrapper
        .findAll('img.icon')
        .map(img => img.attributes('src'));
      expect(srcs[0]).toBe('/icons/x.png');
      expect(getAppIconUrl).toHaveBeenCalledWith({ iconFilename: 'x.png' });
      expect(srcs[1]).toBe('/apps/icons/calculator-128.png');
      expect(srcs[2]).toBe('/apps/icons/file-128.svg');
    });

    it('renders only visible apps and honors snake_case visibility', async () => {
      const apps = [
        { id: 1, name: 'A', slug: 'a', isVisible: false },
        { id: 2, name: 'B', slug: 'b', is_visible: 0 },
        { id: 3, name: 'C', slug: 'c', is_visible: 1 },
      ];

      const { wrapper: vm } = await mountAppIcons({ apps });
      wrapper = vm;

      const icons = wrapper.findAll('.icon-item');
      expect(icons).toHaveLength(1);
      expect(icons[0].attributes('data-id')).toBe('3');
    });

    it('opens custom target_url in a new window without creating an internal window', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const apps = [
        {
          id: 1,
          name: '外链',
          slug: 'ext',
          target_url: 'https://example.com',
          isVisible: true,
        },
      ];

      const { wrapper: vm, getAppComponentBySlug } = await mountAppIcons({
        apps,
      });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('dblclick');

      expect(openSpy).toHaveBeenCalledWith(
        'https://example.com',
        '_blank',
        'noopener,noreferrer'
      );
      expect(getAppComponentBySlug).not.toHaveBeenCalled();
    });

    it('activates the existing window when the app is already open', async () => {
      const apps = [
        { id: 1, name: '计算器', slug: 'calculator', isVisible: true },
      ];
      const { useWindowManager } = await import(
        '@/composables/useWindowManager.js'
      );
      const findWindowByApp = vi.fn(() => ({ id: 7 }));
      const setActiveWindow = vi.fn();
      const createWindow = vi.fn();
      useWindowManager.mockReturnValue({
        createWindow,
        findWindowByApp,
        setActiveWindow,
      });

      const { wrapper: vm } = await mountAppIcons({ apps, component: {} });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('dblclick');

      expect(findWindowByApp).toHaveBeenCalledWith('calculator');
      expect(setActiveWindow).toHaveBeenCalledWith(7);
      expect(createWindow).not.toHaveBeenCalled();
    });

    it('creates a window with preferred size, or skips unregistered apps', async () => {
      const apps = [
        { id: 1, name: '计算器', slug: 'calculator', isVisible: true },
      ];
      const { useWindowManager } = await import(
        '@/composables/useWindowManager.js'
      );
      const createWindow = vi.fn();
      useWindowManager.mockReturnValue({
        createWindow,
        findWindowByApp: vi.fn(() => null),
        setActiveWindow: vi.fn(),
      });

      const component = { render: () => null };
      const { wrapper: vm, getAppComponentBySlug } = await mountAppIcons({
        apps,
        component,
      });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('dblclick');

      expect(getAppComponentBySlug).toHaveBeenCalledWith('calculator');
      expect(createWindow).toHaveBeenCalledTimes(1);
      // function props cannot deep-compare; assert identity and remaining fields
      const [createArgs] = createWindow.mock.calls[0];
      expect(createArgs.component).toBe(component);
      expect(createArgs).toMatchObject({
        title: 'Test App',
        appSlug: 'calculator',
        width: 520,
        height: 400,
      });

      wrapper.unmount();
      createWindow.mockClear();
      const { wrapper: vm2 } = await mountAppIcons({ apps, component: null });
      wrapper = vm2;

      await wrapper.find('.icon-item').trigger('dblclick');

      expect(createWindow).not.toHaveBeenCalled();
    });

    it('context menu offers open and visibility toggle based on state', async () => {
      const apps = [
        { id: 1, name: '计算器', slug: 'calculator', isVisible: true },
        { id: 2, name: '隐藏项', slug: 'hidden', is_visible: 0 },
      ];
      const { useWindowManager } = await import(
        '@/composables/useWindowManager.js'
      );
      const createWindow = vi.fn();
      useWindowManager.mockReturnValue({
        createWindow,
        findWindowByApp: vi.fn(() => null),
        setActiveWindow: vi.fn(),
      });

      const { wrapper: vm } = await mountAppIcons({ apps, component: {} });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('contextmenu', {
        clientX: 30,
        clientY: 40,
      });

      const menu = wrapper.findComponent({ name: 'ContextMenuStub' });
      expect(menu.props('modelValue')).toBe(true);
      expect(menu.props('items')).toEqual([
        { key: 'open', label: '打开' },
        { key: 'toggleVisible', label: '隐藏' },
      ]);
      expect(menu.props('x')).toBe(30);
      expect(menu.props('y')).toBe(40);

      menu.vm.$emit('select', 'open');
      expect(createWindow).toHaveBeenCalledTimes(1);
    });

    it('menu toggle visible persists and refreshes the list', async () => {
      const apps = [
        { id: 1, name: '计算器', slug: 'calculator', isVisible: true },
      ];
      const {
        wrapper: vm,
        fetchAppsList,
        setVisible,
      } = await mountAppIcons({
        apps,
        component: {},
      });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('contextmenu');
      await wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'toggleVisible');
      await flushPromises();

      expect(setVisible).toHaveBeenCalledWith(1, false);
      expect(fetchAppsList).toHaveBeenCalledTimes(2);
    });

    it('menu toggle visible swallows persistence failures', async () => {
      const apps = [
        { id: 1, name: '计算器', slug: 'calculator', isVisible: true },
      ];
      const { wrapper: vm, setVisible } = await mountAppIcons({
        apps,
        component: {},
      });
      wrapper = vm;
      setVisible.mockRejectedValueOnce(new Error('保存失败'));

      await wrapper.find('.icon-item').trigger('contextmenu');
      await wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'toggleVisible');
      await flushPromises();

      expect(
        wrapper.findComponent({ name: 'ContextMenuStub' }).props('items')
      ).toHaveLength(2);
    });

    it('menu select is a no-op before any context menu was opened', async () => {
      const apps = [
        { id: 1, name: '计算器', slug: 'calculator', isVisible: true },
      ];
      const { wrapper: vm, setVisible } = await mountAppIcons({
        apps,
        component: {},
      });
      wrapper = vm;

      await wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'open');

      expect(setVisible).not.toHaveBeenCalled();
      expect(wrapper.emitted('select')).toBeUndefined();
    });
  });
});
