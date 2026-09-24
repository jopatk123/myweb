import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDesktopContextMenu } from '@/composables/useDesktopContextMenu.js';

const makeEvent = ({
  targetIsIcon = false,
  clientX = 100,
  clientY = 80,
} = {}) => ({
  clientX,
  clientY,
  target: { closest: vi.fn(() => (targetIsIcon ? { el: true } : null)) },
});

const flushMicrotasks = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useDesktopContextMenu', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('openMenu / closeMenu', () => {
    it('初始状态：菜单隐藏且无菜单项', () => {
      const { desktopMenu } = useDesktopContextMenu();
      expect(desktopMenu.value).toEqual({
        visible: false,
        x: 0,
        y: 0,
        items: [],
      });
    });

    it('空白处右键打开菜单，记录坐标并携带固定菜单项', () => {
      const { desktopMenu, openMenu } = useDesktopContextMenu();
      openMenu(makeEvent({ clientX: 120, clientY: 90 }));

      expect(desktopMenu.value.visible).toBe(true);
      expect(desktopMenu.value.x).toBe(120);
      expect(desktopMenu.value.y).toBe(90);
      expect(desktopMenu.value.items.map(i => i.key)).toEqual([
        'switch',
        'manage',
        'refresh',
        'autoArrange',
      ]);
    });

    it('右键落在图标上时忽略，不打开菜单', () => {
      const { desktopMenu, openMenu } = useDesktopContextMenu();
      openMenu(makeEvent({ targetIsIcon: true }));

      expect(desktopMenu.value.visible).toBe(false);
      expect(desktopMenu.value.items).toEqual([]);
    });

    it('事件缺失时以 0,0 兜底打开菜单，不抛错', () => {
      const { desktopMenu, openMenu } = useDesktopContextMenu();
      expect(() => openMenu(null)).not.toThrow();
      expect(desktopMenu.value.visible).toBe(true);
      expect(desktopMenu.value.x).toBe(0);
      expect(desktopMenu.value.y).toBe(0);
    });

    it('closeMenu 只隐藏菜单，保留坐标与菜单项', () => {
      const { desktopMenu, openMenu, closeMenu } = useDesktopContextMenu();
      openMenu(makeEvent());
      closeMenu();

      expect(desktopMenu.value.visible).toBe(false);
      expect(desktopMenu.value.x).toBe(100);
      expect(desktopMenu.value.items).toHaveLength(4);
    });
  });

  describe('handleSelect', () => {
    it('switch：触发壁纸随机切换回调并关闭菜单', () => {
      const onRandom = vi.fn();
      const { desktopMenu, openMenu, handleSelect } = useDesktopContextMenu({
        onRandom,
      });
      openMenu(makeEvent());

      handleSelect('switch');

      expect(onRandom).toHaveBeenCalledTimes(1);
      expect(desktopMenu.value.visible).toBe(false);
    });

    it('switch：未提供回调时安全降级，仅关闭菜单', () => {
      const { desktopMenu, openMenu, handleSelect } = useDesktopContextMenu();
      openMenu(makeEvent());

      expect(() => handleSelect('switch')).not.toThrow();
      expect(desktopMenu.value.visible).toBe(false);
    });

    it('manage：新标签打开壁纸管理后台', () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      const { handleSelect } = useDesktopContextMenu();

      handleSelect('manage');

      expect(openSpy).toHaveBeenCalledWith(
        '/wallpapers',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('refresh：触发页面刷新并关闭菜单', () => {
      // jsdom 的 location.reload 不可直接 spy，
      // 通过重定义 globalThis.location 注入可观察的 reload 桩
      const reloadMock = vi.fn();
      const originalLocation = globalThis.location;
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        writable: true,
        value: { reload: reloadMock },
      });

      const { desktopMenu, openMenu, handleSelect } = useDesktopContextMenu();
      openMenu(makeEvent());

      handleSelect('refresh');

      expect(reloadMock).toHaveBeenCalledTimes(1);
      expect(desktopMenu.value.visible).toBe(false);

      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        writable: true,
        value: originalLocation,
      });
    });

    it('autoArrange：应用图标先排列，文件图标以返回列号续排', async () => {
      const appAutoArrange = vi.fn(() => 3);
      const fileAutoArrange = vi.fn();
      const { openMenu, handleSelect } = useDesktopContextMenu({
        appIconsRef: { value: { autoArrange: appAutoArrange } },
        fileIconsRef: { value: { autoArrange: fileAutoArrange } },
      });
      openMenu(makeEvent());

      handleSelect('autoArrange');
      await Promise.resolve();

      expect(appAutoArrange).toHaveBeenCalledWith(0);
      expect(fileAutoArrange).toHaveBeenCalledWith(3);
    });

    it('autoArrange：无应用图标引用时文件图标从第 0 列开始', async () => {
      const fileAutoArrange = vi.fn();
      const { handleSelect } = useDesktopContextMenu({
        fileIconsRef: { value: { autoArrange: fileAutoArrange } },
      });

      handleSelect('autoArrange');
      await Promise.resolve();

      expect(fileAutoArrange).toHaveBeenCalledWith(0);
    });

    it('autoArrange：任一环节拒绝时告警且不产生未处理拒绝', async () => {
      const boom = new Error('arrange failed');
      const { handleSelect } = useDesktopContextMenu({
        appIconsRef: {
          value: { autoArrange: vi.fn(() => Promise.reject(boom)) },
        },
        fileIconsRef: { value: { autoArrange: vi.fn() } },
      });

      handleSelect('autoArrange');
      await flushMicrotasks();

      expect(console.warn).toHaveBeenCalledWith(
        '[useDesktopContextMenu] autoArrange failed',
        boom
      );
    });

    it('fileIconsRef 缺失或无 autoArrange 方法时静默跳过', async () => {
      const appAutoArrange = vi.fn(() => 2);
      const { handleSelect } = useDesktopContextMenu({
        appIconsRef: { value: { autoArrange: appAutoArrange } },
        fileIconsRef: { value: {} },
      });

      await expect(
        Promise.resolve().then(() => handleSelect('autoArrange'))
      ).resolves.not.toThrow();
    });

    it('空 key 直接返回，菜单保持打开', () => {
      const { desktopMenu, openMenu, handleSelect } = useDesktopContextMenu();
      openMenu(makeEvent());

      handleSelect('');

      expect(desktopMenu.value.visible).toBe(true);
    });

    it('未知 key 走 default 分支：无副作用并关闭菜单', () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      const onRandom = vi.fn();
      const { desktopMenu, openMenu, handleSelect } = useDesktopContextMenu({
        onRandom,
      });
      openMenu(makeEvent());

      handleSelect('bogus');

      expect(onRandom).not.toHaveBeenCalled();
      expect(openSpy).not.toHaveBeenCalled();
      expect(desktopMenu.value.visible).toBe(false);
    });
  });
});
