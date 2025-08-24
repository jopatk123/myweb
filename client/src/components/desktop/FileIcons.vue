<template>
  <div
    class="desktop-icons"
    data-group="files"
    @dragstart.prevent
    @dragover.prevent
    @drop.prevent
  >
    <div
      v-for="f in files"
      :key="f.id"
      class="icon-item"
      :class="{ selected: selectedId === f.id || selectedIds.has(f.id) }"
      :data-id="f.id"
      @click="onClick(f, $event)"
      @dblclick="onDblClick(f)"
      @mousedown="onMouseDown(f, $event)"
      @contextmenu.prevent.stop="onContextMenu(f, $event)"
      @dragstart.prevent
      @dragover.prevent
      @drop.prevent
      draggable="false"
      :style="getIconStyle(f)"
    >
      <img :src="getIcon(f)" class="icon" draggable="false" />
      <div class="label">{{ f.originalName || f.original_name }}</div>
    </div>
    <ContextMenu
      v-model="menu.visible"
      :x="menu.x"
      :y="menu.y"
      :items="menu.items"
      @select="onMenuSelect"
    />
  </div>
  <ConfirmDialog
    v-model="confirm.visible"
    title="确认删除"
    :message="`是否删除文件：${confirm.file?.original_name || ''}？`"
    @confirm="onConfirmDelete"
  />
</template>

<script setup>
  import { ref, watch, onMounted } from 'vue';
  import ContextMenu from '@/components/common/ContextMenu.vue';
  import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
  import { useFiles } from '@/composables/useFiles.js';
  import useDesktopGrid from '@/composables/useDesktopGrid.js';
  const {
    GRID,
    positionToCell,
    cellToPosition,
    getOccupiedCellKeys,
    findNextFreeCell,
    finalizeDragForPositions,
    savePositionsToStorage: gridSavePositionsToStorage,
    loadPositionsFromStorage: gridLoadPositionsFromStorage,
  } = useDesktopGrid();

  const props = defineProps({
    files: { type: Array, default: () => [] },
    icons: { type: Object, default: () => ({}) },
  });
  const emit = defineEmits(['open']);

  const selectedId = ref(null);
  const selectedIds = ref(new Set()); // 支持多选
  const positions = ref({}); // { [id]: { x, y } }
  const STORAGE_KEY = 'desktopFileIconPositions';
  let dragState = null;

  // 网格配置由 useDesktopGrid 提供

  const { getDownloadUrl, remove } = useFiles();
  const confirm = ref({ visible: false, file: null });

  function getIcon(file) {
    const t = file?.typeCategory || file?.type_category || 'other';
    return props.icons?.[t] || props.icons?.other || '/apps/icons/file-128.svg';
  }

  function onClick(file) {
    // 单击只选中（清除其他选中）
    selectedId.value = file.id;
    selectedIds.value = new Set([file.id]);
  }
  function onDblClick(file) {
    emit('open', file);
  }

  const menu = ref({ visible: false, x: 0, y: 0, file: null, items: [] });
  function onContextMenu(file, e) {
    selectedId.value = file.id;
    selectedIds.value = new Set([file.id]);
    menu.value.file = file;
    menu.value.x = e.clientX;
    menu.value.y = e.clientY;
    const baseItems = [
      { key: 'download', label: '下载' },
      { key: 'delete', label: '删除', danger: true },
    ];
    const fc = file.typeCategory || file.type_category || '';
    if (fc === 'image' || fc === 'video' || fc === 'word' || fc === 'excel') {
      baseItems.unshift({ key: 'preview', label: '预览' });
    }
    menu.value.items = baseItems;
    menu.value.visible = true;
  }
  async function onMenuSelect(key) {
    const file = menu.value.file;
    if (!file) return;
    if (key === 'download') {
      const url = getDownloadUrl(file.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName || file.original_name || '';
      a.target = '_blank';
      a.click();
      return;
    }
    if (key === 'delete') {
      confirm.value = { visible: true, file };
      return;
    }
    if (key === 'preview') {
      // 向父组件冒泡一个预览请求
      emit('open', { ...file, __preview: true });
      return;
    }
  }

  async function onConfirmDelete() {
    const f = confirm.value.file;
    confirm.value.visible = false;
    if (!f) return;
    try {
      await remove(f.id);
      location.reload();
    } catch {}
  }

  function onMouseDown(file, e) {
    // 长按触发拖动（>150ms）
    const id = file.id;
    const rect = e.currentTarget.getBoundingClientRect();
    // 支持批量拖动：当被按下的图标在 selectedIds 中，则拖动所有选中的图标
    const isMulti = selectedIds.value.has(id);
    if (isMulti) {
      const ids = Array.from(selectedIds.value);
      const origins = {};
      for (const i of ids) {
        const r = e.currentTarget.ownerDocument.querySelector(
          `[data-id="${i}"]`
        );
        // 以已保存的位置为准，fallback 到 DOM rect
        const rectItem = r ? r.getBoundingClientRect() : null;
        origins[i] = positions.value[i]
          ? { x: positions.value[i].x, y: positions.value[i].y }
          : rectItem
            ? { x: rectItem.left, y: rectItem.top }
            : { x: 0, y: 0 };
      }
      dragState = {
        ids,
        startX: e.clientX,
        startY: e.clientY,
        origins,
        longPressTimer: null,
        dragging: false,
      };
    } else {
      dragState = {
        id,
        startX: e.clientX,
        startY: e.clientY,
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
    }, 150);

    document.addEventListener('mouseup', cancelIfNotDrag, { once: true });
  }

  function onMouseMove(e) {
    if (!dragState || !dragState.dragging) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
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
    // 释放时吸附到网格并避免与同组图标重叠
    if (dragState?.dragging)
      finalizeDrag(dragState.ids ? dragState.ids : dragState.id);
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

  // grid helpers provided by useDesktopGrid

  function getIconStyle(file) {
    const p = positions.value[file.id];
    if (!p) return undefined;
    return { position: 'fixed', left: `${p.x}px`, top: `${p.y}px` };
  }

  // 自动排列：支持从指定列开始，按列优先，每列最多 8 行
  async function autoArrange(startCol = 0) {
    const arranged = {};
    let col = startCol;
    let row = 0;
    for (const f of props.files || []) {
      arranged[f.id] = cellToPosition({ col, row });
      row += 1;
      if (row >= GRID.maxRows) {
        row = 0;
        col += 1;
      }
    }
    positions.value = arranged;
    gridSavePositionsToStorage(STORAGE_KEY, positions.value, props.files);
    return col + (row > 0 ? 1 : 0);
  }

  // 外部接口：设置多选
  function setSelectedIds(ids = []) {
    selectedIds.value = new Set(ids.map(i => Number(i)));
    if (ids.length === 1) selectedId.value = ids[0];
  }

  defineExpose({ autoArrange, setSelectedIds });

  function savePositionsToStorage() {
    try {
      gridSavePositionsToStorage(STORAGE_KEY, positions.value, props.files);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('FileIcons.savePositionsToStorage error', e);
    }
  }

  function loadPositionsFromStorage() {
    try {
      positions.value = gridLoadPositionsFromStorage
        ? gridLoadPositionsFromStorage(STORAGE_KEY, props.files)
        : {};
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('FileIcons.loadPositionsFromStorage error', e);
    }
  }

  // 初次载入时尝试恢复位置（在组件挂载后，确保 props.files 已可用）
  onMounted(() => {
    positions.value = gridLoadPositionsFromStorage
      ? gridLoadPositionsFromStorage(STORAGE_KEY, props.files)
      : {};
  });

  // 当父组件传入的 files 变化时，重新加载位置（例如异步 fetch 完成后）
  watch(
    () => props.files,
    () => {
      positions.value = gridLoadPositionsFromStorage
        ? gridLoadPositionsFromStorage(STORAGE_KEY, props.files)
        : {};
    }
  );
</script>

<style scoped>
  .desktop-icons {
    position: absolute;
    top: 20px;
    left: 120px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 72px);
    gap: 16px;
    z-index: 5;
  }
  .icon-item {
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: default;
    user-select: none;
  }
  .icon-item.selected .label {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 2px 4px;
  }
  .icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
    -webkit-user-drag: none;
  }
  .label {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    font-size: 12px;
    text-align: center;
  }
</style>
