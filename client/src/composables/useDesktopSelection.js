import { ref } from 'vue';

export default function useDesktopSelection() {
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
    // 只在空白区域开始选框
    if (e.target.closest('.icon-item')) return;

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

  function onMouseUp(/* e */) {
    if (!isSelecting) return;

    isSelecting = false;
    // 隐藏选框（注意：调用方可能需要在调用 onMouseUp 之前获取选中项）
    selectionRect.value.visible = false;
  }

  function rectIntersect(rect1, rect2) {
    return !(
      rect1.x + rect1.w < rect2.left ||
      rect2.left + rect2.width < rect1.x ||
      rect1.y + rect1.h < rect2.top ||
      rect2.top + rect2.height < rect1.y
    );
  }

  function getSelectedIconIds() {
    const rect = selectionRect.value;
    const selectedApps = [];
    const selectedFiles = [];

    const iconItems = document.querySelectorAll('.icon-item[data-id]');

    iconItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const id = parseInt(item.getAttribute('data-id'));
      if (rectIntersect(rect, itemRect)) {
        const group = item.closest('.desktop-icons')?.dataset?.group;
        const isAppIcon = group === 'apps';
        if (isAppIcon) {
          selectedApps.push(id);
        } else {
          selectedFiles.push(id);
        }
      }
    });

    return { apps: selectedApps, files: selectedFiles };
  }

  return {
    selectionRect,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    getSelectedIconIds,
  };
}
