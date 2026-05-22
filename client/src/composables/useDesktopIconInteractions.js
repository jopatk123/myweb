import { computed, onMounted, ref, unref, watch } from 'vue';
import useDesktopGrid from '@/composables/useDesktopGrid.js';

const LONG_PRESS_MS = 150;

/**
 * 桌面图标交互通用 composable：统一处理选中、长按拖动、网格吸附、位置持久化与自动排列。
 *
 * @param {Object} options
 * @param {import('vue').Ref<Array>|() => Array} options.items 可见图标数据源（ref 或 getter）
 * @param {string} options.storageKey 位置持久化使用的 localStorage 键
 * @param {number} [options.defaultStartCol=0] 新图标默认起始列（应用从 0、文件从 1）
 * @param {string} [options.logTag='useDesktopIconInteractions'] 错误日志前缀
 */
export default function useDesktopIconInteractions({
  items,
  storageKey,
  defaultStartCol = 0,
  logTag = 'useDesktopIconInteractions',
} = {}) {
  if (!storageKey) {
    throw new Error('useDesktopIconInteractions requires a storageKey');
  }

  const grid = useDesktopGrid();
  const {
    GRID,
    cellToPosition,
    positionToCell,
    finalizeDragForPositions,
    savePositionsToStorage: gridSave,
    loadPositionsFromStorage: gridLoad,
  } = grid;

  const itemsRef = computed(() => {
    const value = typeof items === 'function' ? items() : unref(items);
    return Array.isArray(value) ? value : [];
  });

  const selectedId = ref(null);
  const selectedIds = ref(new Set());
  const positions = ref({});
  let dragState = null;
  let lastItemIds = '';

  function onClick(item) {
    selectedId.value = item.id;
    selectedIds.value = new Set([item.id]);
  }

  function setSelectedIds(ids = []) {
    selectedIds.value = new Set(ids.map(i => Number(i)));
    if (ids.length === 1) selectedId.value = ids[0];
  }

  function getIconStyle(item) {
    const p = positions.value[item.id];
    if (!p) return undefined;
    return { position: 'fixed', left: `${p.x}px`, top: `${p.y}px` };
  }

  function onMouseDown(item, event) {
    if (event.button === 2) return; // 忽略右键，避免干扰右键菜单

    const id = item.id;
    const rect = event.currentTarget.getBoundingClientRect();
    const isMulti = selectedIds.value.has(id);

    if (isMulti) {
      const ids = Array.from(selectedIds.value);
      const origins = {};
      for (const i of ids) {
        const node = event.currentTarget.ownerDocument.querySelector(
          `[data-id="${i}"]`
        );
        const rectItem = node ? node.getBoundingClientRect() : null;
        origins[i] = positions.value[i]
          ? { x: positions.value[i].x, y: positions.value[i].y }
          : rectItem
            ? { x: rectItem.left, y: rectItem.top }
            : { x: 0, y: 0 };
      }
      dragState = {
        ids,
        startX: event.clientX,
        startY: event.clientY,
        origins,
        longPressTimer: null,
        dragging: false,
      };
    } else {
      dragState = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        originX: positions.value[id]?.x ?? rect.left,
        originY: positions.value[id]?.y ?? rect.top,
        longPressTimer: null,
        dragging: false,
      };
    }

    dragState.longPressTimer = setTimeout(() => {
      dragState.dragging = true;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp, { once: true });
    }, LONG_PRESS_MS);

    document.addEventListener('mouseup', cancelIfNotDrag, { once: true });
  }

  function onMouseMove(event) {
    if (!dragState || !dragState.dragging) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (dragState.ids) {
      const updated = { ...positions.value };
      for (const i of dragState.ids) {
        const o = dragState.origins[i] || { x: 0, y: 0 };
        updated[i] = { x: o.x + dx, y: o.y + dy };
      }
      positions.value = updated;
    } else {
      positions.value = {
        ...positions.value,
        [dragState.id]: {
          x: dragState.originX + dx,
          y: dragState.originY + dy,
        },
      };
    }
  }

  function onMouseUp() {
    if (dragState?.dragging) {
      finalizeDragForPositions(
        positions,
        dragState.ids ? dragState.ids : dragState.id
      );
    }
    cleanupDrag();
  }

  function cancelIfNotDrag() {
    if (!dragState) return;
    if (!dragState.dragging && dragState.longPressTimer) {
      clearTimeout(dragState.longPressTimer);
    }
    dragState = null;
  }

  function cleanupDrag() {
    if (dragState?.longPressTimer) clearTimeout(dragState.longPressTimer);
    document.removeEventListener('mousemove', onMouseMove);
    dragState = null;
    savePositionsToStorage();
  }

  function savePositionsToStorage() {
    try {
      gridSave(storageKey, positions.value, itemsRef.value);
    } catch (e) {
      console.error(`${logTag}.savePositionsToStorage error`, e);
    }
  }

  function loadPositionsFromStorage() {
    try {
      const list = itemsRef.value;
      const currentIds = list
        .map(item => item.id)
        .sort()
        .join(',');

      if (
        currentIds === lastItemIds &&
        Object.keys(positions.value).length > 0
      ) {
        return;
      }
      lastItemIds = currentIds;

      const saved = gridLoad ? gridLoad(storageKey, list) : {};

      if (list.length === 0) {
        positions.value = saved;
        return;
      }

      const occupied = new Set();
      for (const [, pos] of Object.entries(saved)) {
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          const cell = positionToCell(pos);
          occupied.add(`${cell.col}:${cell.row}`);
        }
      }

      const result = { ...saved };
      for (const item of list) {
        if (!result[item.id]) {
          let col = defaultStartCol;
          let row = 0;
          while (occupied.has(`${col}:${row}`)) {
            row += 1;
            if (row >= GRID.maxRows) {
              row = 0;
              col += 1;
            }
          }
          result[item.id] = cellToPosition({ col, row });
          occupied.add(`${col}:${row}`);
        }
      }

      positions.value = result;
    } catch (e) {
      console.error(`${logTag}.loadPositionsFromStorage error`, e);
    }
  }

  /**
   * 按列优先自动排列图标。
   * @param {number} [startCol] 起始列（默认沿用初始化时的 defaultStartCol）
   * @returns {number} 下一组图标可使用的起始列
   */
  async function autoArrange(startCol = defaultStartCol) {
    const list = itemsRef.value;
    const arranged = {};
    let col = startCol;
    let row = 0;
    for (const item of list) {
      arranged[item.id] = cellToPosition({ col, row });
      row += 1;
      if (row >= GRID.maxRows) {
        row = 0;
        col += 1;
      }
    }
    positions.value = arranged;
    gridSave(storageKey, positions.value, list);
    lastItemIds = list
      .map(item => item.id)
      .sort()
      .join(',');
    return col + (row > 0 ? 1 : 0);
  }

  onMounted(() => {
    loadPositionsFromStorage();
  });

  watch(
    itemsRef,
    (next, prev) => {
      const newIds = (next || [])
        .map(item => item.id)
        .sort()
        .join(',');
      const oldIds = (prev || [])
        .map(item => item.id)
        .sort()
        .join(',');
      if (newIds !== oldIds) loadPositionsFromStorage();
    },
    { deep: false }
  );

  return {
    GRID,
    selectedId,
    selectedIds,
    positions,
    onClick,
    onMouseDown,
    setSelectedIds,
    getIconStyle,
    autoArrange,
    loadPositionsFromStorage,
    savePositionsToStorage,
  };
}
