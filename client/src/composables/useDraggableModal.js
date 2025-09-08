import { ref, onMounted, nextTick, computed } from 'vue';

/**
 * 为模态框提供拖拽移动和位置记忆的功能
 * @param {string} storageKey 用于 localStorage 记忆位置的唯一键名
 */
export function useDraggableModal(storageKey) {
  const modalRef = ref(null);
  const pos = ref({ x: null, y: null });
  let dragging = false;
  let dragStart = null;

  const modalStyle = computed(() => ({
    position: 'absolute',
    left: pos.value.x !== null ? `${pos.value.x}px` : undefined,
    top: pos.value.y !== null ? `${pos.value.y}px` : undefined,
  }));

  function centerModal() {
    if (!modalRef.value) return;
    const el = modalRef.value;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    pos.value = {
      x: Math.max(10, (window.innerWidth - w) / 2),
      y: Math.max(10, (window.innerHeight - h) / 2),
    };
  }

  function loadPosition() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v?.x === 'number' && typeof v?.y === 'number') {
          pos.value = v;
        }
      }
    } catch (e) {
      console.error('Failed to load modal position:', e);
    }
  }

  function savePosition() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos.value));
    } catch (e) {
      console.error('Failed to save modal position:', e);
    }
  }

  function onHeaderPointerDown(e) {
    if (e.button !== 0) return;
    dragging = true;
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      originX: pos.value.x,
      originY: pos.value.y,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }

  function onPointerMove(e) {
    if (!dragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    pos.value = { x: dragStart.originX + dx, y: dragStart.originY + dy };
  }

  function onPointerUp() {
    dragging = false;
    dragStart = null;
    window.removeEventListener('pointermove', onPointerMove);
    savePosition();
  }

  onMounted(async () => {
    await nextTick();
    loadPosition();
    if (pos.value.x === null || pos.value.y === null) {
      centerModal();
    }
  });

  return {
    modalRef,
    modalStyle,
    onHeaderPointerDown,
    // 导出位置引用与保存函数，以便外部（如窗口组件）在从左/上侧调整大小时更新位置
    pos,
    savePosition,
  };
}
