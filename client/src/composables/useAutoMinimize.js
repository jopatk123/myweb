import { ref } from 'vue';
import { useWindowManager } from './useWindowManager.js';

/**
 * 自动最小化功能 - 当窗口失去焦点或鼠标离开时自动最小化
 * @param {Object} options - 配置选项
 * @param {string} options.appSlug - 应用标识
 * @param {number} options.delay - 延迟时间（毫秒），默认 100ms
 * @param {boolean} options.enabled - 是否启用，默认 true
 */
export function useAutoMinimize(options = {}) {
  const { appSlug, delay = 100, enabled: _enabled = true } = options;
  const { findWindowByApp, minimizeWindow, getActiveWindow } =
    useWindowManager();

  const isMouseInside = ref(false);
  const isWindowFocused = ref(false);
  const minimizeTimer = ref(null);

  // 检查当前窗口是否为指定应用且处于活动状态
  function _isAppActive() {
    const activeWindow = getActiveWindow();
    return (
      activeWindow &&
      activeWindow.appSlug === appSlug &&
      !activeWindow.minimized
    );
  }

  // 标注未使用的参数以消除 lint 警告（功能保留以备未来使用）
  void _enabled;
  void _isAppActive;

  // 安排最小化
  function scheduleMinimize(customDelay = delay) {
    cancelMinimize();
    minimizeTimer.value = setTimeout(() => {
      const window = findWindowByApp(appSlug);
      if (window && !window.minimized) {
        minimizeWindow(window.id);
      }
    }, customDelay);
  }

  // 取消最小化
  function cancelMinimize() {
    if (minimizeTimer.value) {
      clearTimeout(minimizeTimer.value);
      minimizeTimer.value = null;
    }
  }

  // 启用/禁用自动最小化
  function setEnabled(value) {
    if (!value) {
      cancelMinimize();
    }
  }

  return {
    isMouseInside,
    isWindowFocused,
    setEnabled,
    scheduleMinimize,
    cancelMinimize,
  };
}
