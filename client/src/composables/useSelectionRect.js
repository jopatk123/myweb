import { ref } from 'vue';

// Composable to manage a desktop-like rectangular selection.
// Provides reactive rect state and event handlers that can be
// attached to a container element. Consumers should provide
// a `hitTestItems(rect)` function (or use component refs) to
// resolve which item ids intersect the rect when selection ends.
export function useSelectionRect({ hitTestItems } = {}) {
  const selectionRect = ref({
    visible: false,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    startX: 0,
    startY: 0,
  });

  let isSelecting = false;

  function onMouseDown(e) {
    // only start on left-button
    if (e.button !== 0) return;
    // ignore clicks on items (caller can check)
    isSelecting = true;
    selectionRect.value.startX = e.clientX;
    selectionRect.value.startY = e.clientY;
    selectionRect.value.x = e.clientX;
    selectionRect.value.y = e.clientY;
    selectionRect.value.w = 0;
    selectionRect.value.h = 0;
    selectionRect.value.visible = true;
  }

  function onMouseMove(e) {
    if (!isSelecting || !selectionRect.value.visible) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const startX = selectionRect.value.startX;
    const startY = selectionRect.value.startY;
    selectionRect.value.x = Math.min(startX, currentX);
    selectionRect.value.y = Math.min(startY, currentY);
    selectionRect.value.w = Math.abs(currentX - startX);
    selectionRect.value.h = Math.abs(currentY - startY);
  }

  async function onMouseUp() {
    if (!isSelecting) return null;
    isSelecting = false;
    const rect = { ...selectionRect.value };
    // hide rect before returning results to avoid visual glitches
    selectionRect.value.visible = false;

    if (typeof hitTestItems === 'function') {
      return await hitTestItems(rect);
    }

    return null;
  }

  function rectIntersect(rect1, rect2) {
    return !(
      rect1.x + rect1.w < rect2.left ||
      rect2.left + rect2.width < rect1.x ||
      rect1.y + rect1.h < rect2.top ||
      rect2.top + rect2.height < rect1.y
    );
  }

  return {
    selectionRect,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    rectIntersect,
  };
}
