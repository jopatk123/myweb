<template>
  <div
    class="desktop-icons"
    @mousedown.stop
    @dragstart.prevent
    @dragover.prevent.stop
    @drop.prevent.stop
  >
    <div
      v-for="f in files"
      :key="f.id"
      class="icon-item"
      :class="{ selected: selectedId === f.id }"
      @click="onClick(f, $event)"
      @dblclick="onDblClick(f)"
      @mousedown="onMouseDown(f, $event)"
      @contextmenu.prevent.stop="onContextMenu(f, $event)"
      @dragstart.prevent
      @dragover.prevent.stop
      @drop.stop.prevent
      draggable="false"
      :style="getIconStyle(f)"
    >
      <img :src="getIcon(f)" class="icon" draggable="false" />
      <div class="label">{{ f.original_name }}</div>
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

  const props = defineProps({
    files: { type: Array, default: () => [] },
    icons: { type: Object, default: () => ({}) },
  });
  const emit = defineEmits(['open']);

  const selectedId = ref(null);
  const positions = ref({}); // { [id]: { x, y } }
  const STORAGE_KEY = 'desktopFileIconPositions';
  let dragState = null;

  // 网格配置：统一与应用图标一致，从左上角 20px 开始，单元 88x88
  const GRID = { originX: 20, originY: 20, cellW: 88, cellH: 88, maxRows: 8 };

  const { getDownloadUrl, remove } = useFiles();
  const confirm = ref({ visible: false, file: null });

  function getIcon(file) {
    const t = file?.type_category || 'other';
    return props.icons?.[t] || props.icons?.other || '/apps/icons/file-128.svg';
  }

  function onClick(file) {
    selectedId.value = file.id;
  }
  function onDblClick(file) {
    emit('open', file);
  }

  const menu = ref({ visible: false, x: 0, y: 0, file: null, items: [] });
  function onContextMenu(file, e) {
    selectedId.value = file.id;
    menu.value.file = file;
    menu.value.x = e.clientX;
    menu.value.y = e.clientY;
    const baseItems = [
      { key: 'download', label: '下载' },
      { key: 'delete', label: '删除', danger: true },
    ];
    if (
      file.type_category === 'image' ||
      file.type_category === 'video' ||
      file.type_category === 'word' ||
      file.type_category === 'excel'
    ) {
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
      a.download = file.original_name || '';
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
    const id = file.id;
    const rect = e.currentTarget.getBoundingClientRect();
    dragState = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      originX: positions.value[id]?.x ?? rect.left,
      originY: positions.value[id]?.y ?? rect.top,
      longPressTimer: null,
      dragging: false,
    };
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
    positions.value = {
      ...positions.value,
      [dragState.id]: { x: dragState.originX + dx, y: dragState.originY + dy },
    };
  }

  function onMouseUp() {
    if (dragState?.dragging) finalizeDrag(dragState.id);
    cleanupDrag();
    savePositionsToStorage();
  }
  function cancelIfNotDrag() {
    if (dragState && !dragState.dragging && dragState.longPressTimer)
      clearTimeout(dragState.longPressTimer);
    dragState = null;
  }
  function cleanupDrag() {
    if (dragState?.longPressTimer) clearTimeout(dragState.longPressTimer);
    document.removeEventListener('mousemove', onMouseMove);
    dragState = null;
  }

  function positionToCell(pos) {
    const col = Math.max(0, Math.round((pos.x - GRID.originX) / GRID.cellW));
    const row = Math.max(0, Math.round((pos.y - GRID.originY) / GRID.cellH));
    return { col, row };
  }

  function cellToPosition(cell) {
    return {
      x: GRID.originX + cell.col * GRID.cellW,
      y: GRID.originY + cell.row * GRID.cellH,
    };
  }

  function getOccupiedCellKeys(excludeId) {
    const set = new Set();
    for (const [k, v] of Object.entries(positions.value || {})) {
      if (Number(k) === Number(excludeId)) continue;
      if (!v) continue;
      const c = positionToCell(v);
      set.add(`${c.col}:${c.row}`);
    }
    return set;
  }

  function findNextFreeCell(desiredCell, occupied) {
    let { col, row } = desiredCell;
    for (let i = 0; i < 10000; i++) {
      const key = `${col}:${row}`;
      if (!occupied.has(key)) return { col, row };
      row += 1;
      if (row > GRID.maxRows * 5) {
        row = 0;
        col += 1;
      }
    }
    return desiredCell;
  }

  function finalizeDrag(id) {
    const p = positions.value?.[id];
    if (!p) return;
    const desired = positionToCell(p);
    const occupied = getOccupiedCellKeys(id);
    const cell = findNextFreeCell(desired, occupied);
    positions.value = { ...positions.value, [id]: cellToPosition(cell) };
  }

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
    savePositionsToStorage();
    return col + (row > 0 ? 1 : 0);
  }

  defineExpose({ autoArrange });

  function savePositionsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions.value));
    } catch {}
  }

  function loadPositionsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const filtered = {};
      const validIds = new Set((props.files || []).map(f => f.id));
      for (const [k, v] of Object.entries(data || {})) {
        if (
          validIds.has(Number(k)) &&
          v &&
          typeof v.x === 'number' &&
          typeof v.y === 'number'
        )
          filtered[k] = { x: v.x, y: v.y };
      }
      positions.value = filtered;
    } catch {}
  }

  // 初次载入时尝试恢复位置（在组件挂载后，确保 props.files 已可用）
  onMounted(() => {
    loadPositionsFromStorage();
  });

  // 当父组件传入的 files 变化时，重新加载位置（例如异步 fetch 完成后）
  watch(
    () => props.files,
    () => {
      loadPositionsFromStorage();
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
