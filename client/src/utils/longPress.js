export const LONG_PRESS_MS = 500;
export const LONG_PRESS_MOVE_TOLERANCE = 10;

/**
 * 触摸长按。鼠标按下不触发，避免和桌面拖拽、双击冲突。
 */
export function createLongPress(onLongPress, options = {}) {
  const delay = options.delay ?? LONG_PRESS_MS;
  const tolerance = options.tolerance ?? LONG_PRESS_MOVE_TOLERANCE;
  let timer = null;
  let startX = 0;
  let startY = 0;
  let suppressClick = false;
  let pointerId = null;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function endPointer() {
    clearTimer();
    pointerId = null;
  }

  function onPointerDown(event) {
    if (!event || event.pointerType === 'mouse') return;
    if (event.isPrimary === false) return;
    suppressClick = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      suppressClick = true;
      onLongPress(event);
    }, delay);
  }

  function onPointerMove(event) {
    if (pointerId === null || !event || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) > tolerance) endPointer();
  }

  function onPointerUp(event) {
    if (pointerId === null) return;
    if (event && event.pointerId !== pointerId) return;
    endPointer();
  }

  function consumeClick(event) {
    if (!suppressClick) return false;
    suppressClick = false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return true;
  }

  function dispose() {
    endPointer();
    suppressClick = false;
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    consumeClick,
    dispose,
  };
}
