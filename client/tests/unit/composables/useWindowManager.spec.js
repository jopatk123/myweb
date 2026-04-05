/**
 * useWindowManager composable 单元测试
 * 覆盖窗口的创建、关闭、激活、最小化、最大化等全部管理功能
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { effectScope, markRaw } from 'vue';
import {
  useWindowManager,
  resetWindowManagerState,
} from '@/composables/useWindowManager.js';

const MockComponent = markRaw({ template: '<div>Mock</div>' });

// 每个测试前重置全局窗口状态（useWindowManager 使用模块级共享状态）
beforeEach(() => {
  resetWindowManagerState();
  vi.clearAllMocks();
});

describe('useWindowManager — 窗口创建', () => {
  it('createWindow 返回含默认属性的窗口对象', () => {
    const { createWindow } = useWindowManager();
    const win = createWindow({
      title: '测试应用',
      appSlug: 'test-app',
      component: MockComponent,
    });

    expect(win.title).toBe('测试应用');
    expect(win.appSlug).toBe('test-app');
    expect(win.minimized).toBe(false);
    expect(win.maximized).toBe(false);
    expect(win.visible).toBe(true);
    expect(win.width).toBe(520);
    expect(win.height).toBe(400);
  });

  it('连续创建两个窗口，id 递增', () => {
    const { createWindow } = useWindowManager();
    const a = createWindow({ title: 'A' });
    const b = createWindow({ title: 'B' });
    expect(b.id).toBe(a.id + 1);
  });

  it('createWindow 后，新窗口成为活动窗口', () => {
    const { createWindow, activeWindowId } = useWindowManager();
    const win = createWindow({ title: 'Active' });
    expect(activeWindowId.value).toBe(win.id);
  });

  it('options.activate=false 时不抢占活动窗口', () => {
    const { createWindow, activeWindowId } = useWindowManager();
    const first = createWindow({ title: 'First' });
    createWindow({ title: 'Second', activate: false });
    expect(activeWindowId.value).toBe(first.id);
  });

  it('自定义 storageKey 被正确保存', () => {
    const { createWindow } = useWindowManager();
    const win = createWindow({ storageKey: 'custom:key' });
    expect(win.storageKey).toBe('custom:key');
  });

  it('自定义 props 被正确保存', () => {
    const { createWindow } = useWindowManager();
    const win = createWindow({ props: { fileId: 42 } });
    expect(win.props.fileId).toBe(42);
  });
});

describe('useWindowManager — 窗口关闭', () => {
  it('closeWindow 从 windows 列表中移除窗口', () => {
    const { createWindow, closeWindow, windows } = useWindowManager();
    const win = createWindow({ title: 'Close me' });
    expect(windows.value).toHaveLength(1);

    closeWindow(win.id);
    expect(windows.value).toHaveLength(0);
  });

  it('关闭活动窗口后，激活最后一个剩余窗口', () => {
    const { createWindow, closeWindow, activeWindowId } = useWindowManager();
    const a = createWindow({ title: 'A' });
    const b = createWindow({ title: 'B' });
    expect(activeWindowId.value).toBe(b.id);

    closeWindow(b.id);
    expect(activeWindowId.value).toBe(a.id);
  });

  it('关闭最后一个窗口后，activeWindowId 为 null', () => {
    const { createWindow, closeWindow, activeWindowId } = useWindowManager();
    const win = createWindow({ title: 'Only' });
    closeWindow(win.id);
    expect(activeWindowId.value).toBeNull();
  });

  it('关闭不存在的窗口不抛出错误', () => {
    const { closeWindow } = useWindowManager();
    expect(() => closeWindow(999)).not.toThrow();
  });
});

describe('useWindowManager — 活动窗口管理', () => {
  it('setActiveWindow 将目标窗口设为活动并提升 zIndex', () => {
    const { createWindow, setActiveWindow, activeWindowId } =
      useWindowManager();
    const a = createWindow({ title: 'A' });
    const b = createWindow({ title: 'B' });

    setActiveWindow(a.id);
    expect(activeWindowId.value).toBe(a.id);
    expect(a.zIndex).toBeGreaterThan(b.zIndex);
  });

  it('setActiveWindow 传入不存在的 id，不改变状态', () => {
    const { createWindow, setActiveWindow, activeWindowId } =
      useWindowManager();
    const win = createWindow({ title: 'Win' });
    setActiveWindow(999);
    expect(activeWindowId.value).toBe(win.id);
  });
});

describe('useWindowManager — 最小化 / 恢复', () => {
  it('minimizeWindow 将窗口标记为最小化且隐藏', () => {
    const { createWindow, minimizeWindow } = useWindowManager();
    const win = createWindow({ title: 'Minimize me' });

    minimizeWindow(win.id);
    expect(win.minimized).toBe(true);
    expect(win.visible).toBe(false);
  });

  it('最小化活动窗口后，激活另一个可见窗口', () => {
    const { createWindow, minimizeWindow, activeWindowId } = useWindowManager();
    const a = createWindow({ title: 'A' });
    const b = createWindow({ title: 'B' });
    expect(activeWindowId.value).toBe(b.id);

    minimizeWindow(b.id);
    expect(activeWindowId.value).toBe(a.id);
  });

  it('restoreWindow 将最小化的窗口恢复为可见并激活', () => {
    const { createWindow, minimizeWindow, restoreWindow, activeWindowId } =
      useWindowManager();
    const win = createWindow({ title: 'Restore me' });
    minimizeWindow(win.id);
    expect(win.minimized).toBe(true);

    restoreWindow(win.id);
    expect(win.minimized).toBe(false);
    expect(win.visible).toBe(true);
    expect(activeWindowId.value).toBe(win.id);
  });
});

describe('useWindowManager — 最大化', () => {
  it('toggleMaximize 切换最大化状态', () => {
    const { createWindow, toggleMaximize } = useWindowManager();
    const win = createWindow({ title: 'Max me' });

    toggleMaximize(win.id);
    expect(win.maximized).toBe(true);

    toggleMaximize(win.id);
    expect(win.maximized).toBe(false);
  });
});

describe('useWindowManager — 查找窗口', () => {
  it('findWindowByApp 查找可见窗口', () => {
    const { createWindow, findWindowByApp } = useWindowManager();
    createWindow({ appSlug: 'note-app', title: 'Note' });

    const found = findWindowByApp('note-app');
    expect(found).toBeDefined();
    expect(found.appSlug).toBe('note-app');
  });

  it('findWindowByApp 对最小化（不可见）窗口返回 undefined', () => {
    const { createWindow, minimizeWindow, findWindowByApp } =
      useWindowManager();
    const win = createWindow({ appSlug: 'hidden-app', title: 'Hidden' });
    minimizeWindow(win.id);

    expect(findWindowByApp('hidden-app')).toBeUndefined();
  });

  it('findWindowByAppAll 包含最小化窗口', () => {
    const { createWindow, minimizeWindow, findWindowByAppAll } =
      useWindowManager();
    const win = createWindow({ appSlug: 'hidden-app', title: 'Hidden' });
    minimizeWindow(win.id);

    const found = findWindowByAppAll('hidden-app');
    expect(found).toBeDefined();
  });

  it('getActiveWindow 返回当前活动窗口', () => {
    const { createWindow, getActiveWindow } = useWindowManager();
    const win = createWindow({ title: 'Active' });

    const active = getActiveWindow();
    expect(active).toBeDefined();
    expect(active.id).toBe(win.id);
  });

  it('getAllWindows 返回所有窗口数组', () => {
    const { createWindow, getAllWindows } = useWindowManager();
    createWindow({ title: 'A' });
    createWindow({ title: 'B' });

    expect(getAllWindows()).toHaveLength(2);
  });
});

describe('useWindowManager — showWindowWithoutFocus', () => {
  it('显示最小化窗口但不改变当前活动窗口', () => {
    const {
      createWindow,
      minimizeWindow,
      showWindowWithoutFocus,
      activeWindowId,
    } = useWindowManager();
    const a = createWindow({ title: 'A' });
    const b = createWindow({ title: 'B' });
    minimizeWindow(b.id);
    // a 现在是活动窗口
    expect(activeWindowId.value).toBe(a.id);

    showWindowWithoutFocus(b.id);
    expect(b.minimized).toBe(false);
    expect(b.visible).toBe(true);
    // 活动窗口未被改变
    expect(activeWindowId.value).toBe(a.id);
  });
});

describe('useWindowManager — cleanupOwnedWindows', () => {
  it('scope dispose 时自动关闭拥有的窗口', () => {
    let winId;
    let allWindows;

    const scope = effectScope();
    scope.run(() => {
      const mgr = useWindowManager({ autoCleanup: true });
      allWindows = mgr.windows;
      const win = mgr.createWindow({ title: 'Owned' });
      winId = win.id;
    });

    expect(allWindows.value.some(w => w.id === winId)).toBe(true);
    scope.stop(); // 触发 onScopeDispose → cleanupOwnedWindows
    expect(allWindows.value.some(w => w.id === winId)).toBe(false);
  });

  it('autoCleanup=false 时，scope dispose 不关闭窗口', () => {
    let allWindows;
    let winId;

    const scope = effectScope();
    scope.run(() => {
      const mgr = useWindowManager({ autoCleanup: false });
      allWindows = mgr.windows;
      const win = mgr.createWindow({ title: 'Persistent' });
      winId = win.id;
    });

    scope.stop();
    expect(allWindows.value.some(w => w.id === winId)).toBe(true);
  });
});
