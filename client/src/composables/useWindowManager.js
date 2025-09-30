import {
  ref,
  reactive,
  nextTick as _nextTick,
  markRaw,
  onScopeDispose,
} from 'vue';

// 全局窗口管理器
const windows = ref([]);
const activeWindowId = ref(null);
let nextWindowId = 1;
let baseZIndex = 1000;

/**
 * 窗口管理器 - 管理多个应用窗口
 */
export function useWindowManager(options = {}) {
  const { autoCleanup = true } = options;
  const ownedWindowIds = new Set();
  void _nextTick;
  /**
   * 创建新窗口
   * @param {Object} options - 窗口配置
   * @param {Object} options.component - Vue组件
   * @param {string} options.title - 窗口标题
   * @param {string} options.appSlug - 应用标识
   * @param {number} options.width - 窗口宽度
   * @param {number} options.height - 窗口高度
   */
  function createWindow(options = {}) {
    const windowId = nextWindowId++;

    // 允许传入 props 和自定义 storageKey
    const storageKey = String(
      options.storageKey || `window:${options.appSlug || windowId}:${windowId}`
    );

    const window = reactive({
      id: windowId,
      // 将组件标记为非响应式，避免 Vue 将组件对象转换为 reactive，
      // 这会导致性能问题并触发运行时警告
      component: options.component ? markRaw(options.component) : null,
      title: options.title || '应用窗口',
      appSlug: options.appSlug || '',
      width: options.width || 520,
      height: options.height || 400,
      x: null, // 将由 useDraggableModal / 拖拽逻辑管理
      y: null,
      zIndex: baseZIndex + windowId,
      minimized: false,
      maximized: false,
      visible: true,
      storageKey,
      // 可选 props，将被传递给渲染组件
      props: options.props || {},
    });

    windows.value.push(window);
    if (autoCleanup) {
      ownedWindowIds.add(windowId);
    }
    // 允许传入 options.activate = false 来避免创建时抢占焦点
    if (options.activate !== false) {
      setActiveWindow(windowId);
    }

    return window;
  }

  /**
   * 在不改变活动窗口（不设置 activeWindowId）的情况下显示/恢复窗口
   * 这用于像通知类的自动弹窗场景：显示窗口但不抢占当前焦点
   */
  function showWindowWithoutFocus(windowId) {
    const window = windows.value.find(w => w.id === windowId);
    if (window) {
      window.minimized = false;
      window.maximized = false;
      window.visible = true;
      // 不调用 setActiveWindow， 保持当前活动窗口不变
    }
  }

  /**
   * 关闭窗口
   */
  function closeWindow(windowId) {
    const index = windows.value.findIndex(w => w.id === windowId);
    if (index === -1) return;

    windows.value.splice(index, 1);
    if (autoCleanup) {
      ownedWindowIds.delete(windowId);
    }

    // 如果关闭的是活动窗口，激活最后一个窗口
    if (activeWindowId.value === windowId) {
      const lastWindow = windows.value[windows.value.length - 1];
      activeWindowId.value = lastWindow ? lastWindow.id : null;
    }
  }

  /**
   * 设置活动窗口
   */
  function setActiveWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId);
    if (!window) return;

    activeWindowId.value = windowId;

    // 提升窗口层级
    const maxZ = Math.max(...windows.value.map(w => w.zIndex));
    if (window.zIndex < maxZ) {
      window.zIndex = maxZ + 1;
    }
  }

  /**
   * 最小化窗口
   */
  function minimizeWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId);
    if (window) {
      window.minimized = true;
      window.visible = false;

      // 如果最小化的是活动窗口，激活下一个可见窗口
      if (activeWindowId.value === windowId) {
        const nextWindow = windows.value.find(
          w => w.visible && w.id !== windowId
        );
        activeWindowId.value = nextWindow ? nextWindow.id : null;
      }
    }
  }

  /**
   * 恢复窗口
   */
  function restoreWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId);
    if (window) {
      window.minimized = false;
      window.maximized = false;
      window.visible = true;
      setActiveWindow(windowId);
    }
  }

  /**
   * 最大化/恢复窗口
   */
  function toggleMaximize(windowId) {
    const window = windows.value.find(w => w.id === windowId);
    if (window) {
      window.maximized = !window.maximized;
      setActiveWindow(windowId);
    }
  }

  onScopeDispose(() => {
    if (!autoCleanup) return;
    for (const windowId of ownedWindowIds) {
      closeWindow(windowId);
    }
    ownedWindowIds.clear();
  });

  /**
   * 检查应用是否已经打开
   */
  function findWindowByApp(appSlug) {
    return windows.value.find(w => w.appSlug === appSlug && w.visible);
  }

  /**
   * 检查应用（无视 visible 状态）是否已经存在（包括最小化或隐藏的窗口）
   */
  function findWindowByAppAll(appSlug) {
    return windows.value.find(w => w.appSlug === appSlug);
  }

  /**
   * 获取所有窗口
   */
  function getAllWindows() {
    return windows.value;
  }

  /**
   * 获取活动窗口
   */
  function getActiveWindow() {
    return windows.value.find(w => w.id === activeWindowId.value);
  }

  return {
    windows,
    activeWindowId,
    createWindow,
    closeWindow,
    setActiveWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
    findWindowByApp,
    findWindowByAppAll,
    getAllWindows,
    getActiveWindow,
    showWindowWithoutFocus,
  };
}

export function resetWindowManagerState() {
  windows.value = [];
  activeWindowId.value = null;
  nextWindowId = 1;
  baseZIndex = 1000;
}
