<template>
  <div
    class="desktop-icons"
    @mousedown.stop
    @dragstart.prevent
    @dragover.prevent.stop
    @drop.prevent.stop
  >
    <div
      v-for="app in visibleApps"
      :key="app.id"
      class="icon-item"
      :class="{ selected: selectedId === app.id }"
      @click="onClick(app, $event)"
      @dblclick="onDblClick(app)"
      @mousedown="onMouseDown(app, $event)"
      @contextmenu.prevent.stop="onContextMenu(app, $event)"
      @dragstart.prevent
      @dragover.prevent.stop
      @drop.stop.prevent
      draggable="false"
      :style="getIconStyle(app)"
    >
      <img :src="getIconUrl(app)" class="icon" draggable="false" />
      <div class="label">{{ app.name }}</div>
    </div>

    <AppLauncherModal
      v-model="show"
      :component="currentComponent"
      :title="currentTitle"
      :storageKey="currentStorageKey"
    />

    <ContextMenu
      v-model="menu.visible"
      :x="menu.x"
      :y="menu.y"
      :items="menu.items"
      @select="onMenuSelect"
    />
  </div>
</template>

<script setup>
  import { ref, shallowRef, computed, onMounted, watch } from 'vue';
  import { useApps } from '@/composables/useApps.js';
  import { getAppComponentBySlug, getAppMetaBySlug } from '@/apps/registry.js';
  import AppLauncherModal from './AppLauncherModal.vue';
  import ContextMenu from '@/components/common/ContextMenu.vue';

  const { apps, fetchApps, getAppIconUrl, setVisible } = useApps();

  const show = ref(false);
  const currentComponent = shallowRef(null);
  const currentTitle = ref('');
  const currentStorageKey = ref('');
  const selectedId = ref(null);
  const positions = ref({}); // { [appId]: { x, y } }
  const STORAGE_KEY = 'desktopIconPositions';
  let dragState = null; // { id, startX, startY, originX, originY, longPressTimer }

  // 网格配置（与样式保持一致：left/top 起点 20px，图标宽 72 + 间距 16）
  const GRID = { originX: 20, originY: 20, cellW: 88, cellH: 88, maxRows: 8 };

  const visibleApps = computed(() =>
    (apps.value || []).filter(a => a.is_visible)
  );

  // 优先使用后端提供的图标路径，否则根据 slug 推断本地 public 目录下的图标
  function getIconUrl(app) {
    if (app.icon_filename) {
      return getAppIconUrl(app); // 使用 useApps 中的方法
    }
    // 后端未提供图标，根据 slug 推断本地路径
    // 注意：这里假设了图标文件的命名规范
    if (app.slug === 'snake') {
      return `/apps/icons/snake-128.png`;
    }
    if (app.slug === 'calculator') {
      return `/apps/icons/calculator-128.png`;
    }
    return '/apps/icons/file-128.svg'; // 提供一个默认图标
  }

  function open(app) {
    const comp = getAppComponentBySlug(app.slug);
    const meta = getAppMetaBySlug(app.slug);
    currentComponent.value = comp;
    currentTitle.value = meta?.name || app.name || '';
    currentStorageKey.value = app.slug || String(app.id || '');
    show.value = true;
  }

  function onClick(app, e) {
    // 单击只选中
    selectedId.value = app.id;
  }

  function onDblClick(app) {
    // 双击打开
    open(app);
  }

  // 右键菜单
  const menu = ref({ visible: false, x: 0, y: 0, app: null, items: [] });
  function onContextMenu(app, e) {
    selectedId.value = app.id;
    menu.value.app = app;
    menu.value.x = e.clientX;
    menu.value.y = e.clientY;
    menu.value.items = [
      { key: 'open', label: '打开' },
      { key: 'toggleVisible', label: app.is_visible ? '隐藏' : '显示' },
    ];
    menu.value.visible = true;
  }
  async function onMenuSelect(key) {
    const app = menu.value.app;
    if (!app) return;
    if (key === 'open') {
      open(app);
      return;
    }
    if (key === 'toggleVisible') {
      try {
        await setVisible(app.id, !app.is_visible);
        await fetchApps({ visible: true }, true);
      } catch {}
    }
  }

  function onMouseDown(app, e) {
    // 长按触发拖动（>150ms）
    const id = app.id;
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
    // 释放时吸附到网格并避免与同组图标重叠
    if (dragState?.dragging) finalizeDrag(dragState.id);
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
      // 顺序向下寻找空位
      row += 1;
      // 防止无限向下，超过一定行数后换到下一列
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

  function getIconStyle(app) {
    const p = positions.value[app.id];
    if (!p) return undefined;
    return {
      position: 'fixed',
      left: `${p.x}px`,
      top: `${p.y}px`,
    };
  }

  // 自动排列：从左上角开始，按列优先，每列最多 8 行
  async function autoArrange(startCol = 0) {
    const arranged = {};
    let col = startCol;
    let row = 0;
    for (const app of visibleApps.value || []) {
      arranged[app.id] = cellToPosition({ col, row });
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

  onMounted(async () => {
    await fetchApps({ visible: true }, true);
    loadPositionsFromStorage();
  });

  // 当 apps 列表更新后，重新加载已保存的位置（例如从后端异步拉取完成）
  watch(apps, () => {
    loadPositionsFromStorage();
  });

  // 将位置持久化到 localStorage
  function savePositionsToStorage() {
    try {
      // 仅保存当前存在的应用 id 的位置
      const validIds = new Set((apps.value || []).map(a => a.id));
      const data = {};
      for (const [k, v] of Object.entries(positions.value || {})) {
        if (validIds.has(Number(k))) data[k] = v;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  function loadPositionsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      // 过滤无效 id
      const validIds = new Set((apps.value || []).map(a => a.id));
      const filtered = {};
      for (const [k, v] of Object.entries(data || {})) {
        if (
          validIds.has(Number(k)) &&
          v &&
          typeof v.x === 'number' &&
          typeof v.y === 'number'
        ) {
          filtered[k] = { x: v.x, y: v.y };
        }
      }
      positions.value = filtered;
    } catch {}
  }

  // 当应用列表变化时，清理无效位置
  watch(apps, () => {
    loadPositionsFromStorage();
  });
</script>

<style scoped>
  .desktop-icons {
    position: absolute;
    top: 20px;
    left: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 72px);
    gap: 16px;
    z-index: 10;
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
