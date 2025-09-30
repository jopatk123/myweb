import { computed, ref, onUnmounted, getCurrentInstance } from 'vue';
import { useWindowManager } from '@/composables/useWindowManager.js';

/**
 * 为小说阅读器窗口提供自动最小化行为
 * @param {import('vue').Ref<Object>} windowRef - 当前窗口对象的 ref
 * @param {import('vue').Ref<boolean>} isActiveRef - 表示窗口是否处于激活状态的 ref
 */
export function useNovelReaderAutoMinimize(windowRef, isActiveRef) {
  const minimizeTimer = ref(null);
  const { minimizeWindow } = useWindowManager();

  const isNovelReader = computed(
    () => windowRef.value?.appSlug === 'novel-reader'
  );

  function getNovelReaderSettings() {
    try {
      const settings = localStorage.getItem('novel-reader-settings');
      return settings ? JSON.parse(settings) : { autoMinimize: false };
    } catch {
      return { autoMinimize: false };
    }
  }

  const isAutoMinimizeEnabled = computed(() => {
    if (!isNovelReader.value) return false;
    const settings = getNovelReaderSettings();
    return settings.autoMinimize === true;
  });

  function scheduleMinimize(delay = 100) {
    cancelMinimize();
    if (!isAutoMinimizeEnabled.value) return;

    minimizeTimer.value = setTimeout(() => {
      if (!windowRef.value?.minimized && windowRef.value?.id) {
        minimizeWindow(windowRef.value.id);
      }
    }, delay);
  }

  function cancelMinimize() {
    if (minimizeTimer.value) {
      clearTimeout(minimizeTimer.value);
      minimizeTimer.value = null;
    }
  }

  function onMouseEnter() {
    if (isNovelReader.value && isAutoMinimizeEnabled.value) {
      cancelMinimize();
    }
  }

  function onMouseLeave() {
    if (
      isNovelReader.value &&
      isActiveRef.value &&
      isAutoMinimizeEnabled.value
    ) {
      scheduleMinimize();
    }
  }

  function onFocusIn() {
    if (isNovelReader.value && isAutoMinimizeEnabled.value) {
      cancelMinimize();
    }
  }

  function onFocusOut() {
    if (
      isNovelReader.value &&
      isActiveRef.value &&
      isAutoMinimizeEnabled.value
    ) {
      scheduleMinimize(0);
    }
  }

  if (getCurrentInstance()) {
    onUnmounted(cancelMinimize);
  }

  return {
    onMouseEnter,
    onMouseLeave,
    onFocusIn,
    onFocusOut,
    scheduleMinimize,
    cancelMinimize,
    isAutoMinimizeEnabled,
  };
}
