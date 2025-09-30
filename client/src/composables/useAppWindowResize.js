import { onMounted, onUnmounted } from 'vue';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

/**
 * 管理桌面应用窗口的缩放行为与尺寸持久化
 * @param {import('vue').Ref<Object>} windowRef - 窗口对象 ref
 * @param {import('vue').Ref<{ x: number, y: number }>} posRef - 引用可变的窗口位置
 * @param {Function} savePosition - 保存位置的函数
 */
export function useAppWindowResize(windowRef, posRef, savePosition) {
  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startLeft = 0;
  let startTop = 0;
  let resizeCorner = 'br';

  function loadPersistedSize() {
    if (typeof window === 'undefined') return;
    try {
      const key = windowRef.value?.storageKey
        ? `${windowRef.value.storageKey}:size`
        : null;
      if (!key) return;
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.width === 'number') {
        windowRef.value.width = parsed.width;
      }
      if (parsed && typeof parsed.height === 'number') {
        windowRef.value.height = parsed.height;
      }
    } catch {
      // ignore
    }
  }

  function persistSize() {
    if (typeof window === 'undefined') return;
    try {
      const key = windowRef.value?.storageKey
        ? `${windowRef.value.storageKey}:size`
        : null;
      if (!key) return;
      const obj = {
        width: Number(windowRef.value?.width || 0),
        height: Number(windowRef.value?.height || 0),
      };
      window.localStorage.setItem(key, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  function onResizeStart(e, corner = 'br') {
    e.stopPropagation();
    e.preventDefault();
    if (windowRef.value?.maximized) return;

    resizing = true;
    resizeCorner = corner;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = Number(windowRef.value?.width ?? 520);
    startHeight = Number(windowRef.value?.height ?? 400);
    startLeft = Number(posRef.value?.x ?? 0);
    startTop = Number(posRef.value?.y ?? 0);

    document.addEventListener('pointermove', onResizing);
    document.addEventListener('pointerup', onResizeEnd, { once: true });
  }

  function onResizing(e) {
    if (!resizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newW = startWidth;
    let newH = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    switch (resizeCorner) {
      case 'br':
        newW = Math.max(MIN_WIDTH, Math.round(startWidth + dx));
        newH = Math.max(MIN_HEIGHT, Math.round(startHeight + dy));
        break;
      case 'bl':
        newW = Math.round(startWidth - dx);
        if (newW < MIN_WIDTH) newW = MIN_WIDTH;
        newLeft = startLeft + (startWidth - newW);
        newH = Math.max(MIN_HEIGHT, Math.round(startHeight + dy));
        break;
      case 'tr':
        newW = Math.max(MIN_WIDTH, Math.round(startWidth + dx));
        newH = Math.round(startHeight - dy);
        if (newH < MIN_HEIGHT) newH = MIN_HEIGHT;
        newTop = startTop + (startHeight - newH);
        break;
      case 'tl':
        newW = Math.round(startWidth - dx);
        if (newW < MIN_WIDTH) newW = MIN_WIDTH;
        newLeft = startLeft + (startWidth - newW);
        newH = Math.round(startHeight - dy);
        if (newH < MIN_HEIGHT) newH = MIN_HEIGHT;
        newTop = startTop + (startHeight - newH);
        break;
    }

    if (windowRef.value) {
      windowRef.value.width = newW;
      windowRef.value.height = newH;
    }

    if (posRef.value) {
      if (typeof newLeft === 'number') posRef.value.x = Math.round(newLeft);
      if (typeof newTop === 'number') posRef.value.y = Math.round(newTop);
    }
  }

  function onResizeEnd() {
    resizing = false;
    document.removeEventListener('pointermove', onResizing);
    persistSize();
    try {
      savePosition?.();
    } catch {
      // ignore
    }
  }

  onMounted(() => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => loadPersistedSize(), 0);
  });

  onUnmounted(() => {
    document.removeEventListener('pointermove', onResizing);
    if (resizing) {
      try {
        savePosition?.();
      } catch {
        // ignore
      }
    }
    resizing = false;
  });

  return {
    onResizeStart,
  };
}

export { MIN_WIDTH, MIN_HEIGHT };
