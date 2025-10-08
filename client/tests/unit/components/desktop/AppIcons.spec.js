import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import AppIcons from '@/components/desktop/AppIcons.vue';

// Mock composables
vi.mock('@/composables/useApps.js', () => ({
  useApps: vi.fn(() => ({
    apps: { value: [] },
    fetchApps: vi.fn(),
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
    it('右键点击图标应该显示菜单但不触发拖动', async () => {
      const mockApps = [
        { id: 1, name: 'Test App', slug: 'test-app', isVisible: true },
      ];

      const { useApps } = await import('@/composables/useApps.js');
      useApps.mockReturnValue({
        apps: { value: mockApps },
        fetchApps: vi.fn(),
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
        apps: { value: mockApps },
        fetchApps: vi.fn(),
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
        apps: { value: mockApps },
        fetchApps: vi.fn(),
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
});
