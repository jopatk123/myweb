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
      :class="{ selected: selectedId === app.id || selectedIds.has(app.id) }"
      :data-id="app.id"
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

  import useDesktopGrid from '@/composables/useDesktopGrid.js';
  const {
    GRID,
    positionToCell,
    cellToPosition,
    getOccupiedCellKeys,
    findNextFreeCell,
    finalizeDragForPositions,
    savePositionsToStorage: gridSavePositionsToStorage,
    loadPositionsFromStorage: gridLoadPositionsToStorage,
  } = useDesktopGrid();

  const { apps, fetchApps, getAppIconUrl, setVisible } = useApps();

  const show = ref(false);
  const currentComponent = shallowRef(null);
  const currentTitle = ref('');
  const currentStorageKey = ref('');
  const selectedId = ref(null);
  const selectedIds = ref(new Set()); // 支持多选
  const positions = ref({}); // { [appId]: { x, y } }
  const STORAGE_KEY = 'desktopIconPositions';
  let dragState = null; // { id, startX, startY, originX, originY, longPressTimer }

  // 网格配置由 useDesktopGrid 提供

  const visibleApps = computed(() =>
    (apps.value || []).filter(a => a.isVisible ?? a.is_visible)
  );

  // 优先使用后端提供的图标路径，否则根据 slug 推断本地 public 目录下的图标
  function getIconUrl(app) {
    const filename = app.iconFilename || app.icon_filename;
    if (filename) {
      return getAppIconUrl({ iconFilename: filename }); // 使用 useApps 中的方法
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
    // 自定义APP：若存在 target_url，则新窗口打开
    if (app.targetUrl || app.target_url) {
      const url = app.targetUrl || app.target_url;
      try {
        window.open(url, '_blank');
        return;
      } catch {}
    }
    // 内置APP：使用本地组件
    const comp = getAppComponentBySlug(app.slug);
    const meta = getAppMetaBySlug(app.slug);
    currentComponent.value = comp;
    currentTitle.value = meta?.name || app.name || '';
    currentStorageKey.value = app.slug || String(app.id || '');
    show.value = true;
  }

  function onClick(app, e) {
    // 单击只选中（清除其他选中）
    selectedId.value = app.id;
    selectedIds.value = new Set([app.id]);
  }

  function onDblClick(app) {
    // 双击打开
    open(app);
  }

  // 右键菜单
  const menu = ref({ visible: false, x: 0, y: 0, app: null, items: [] });
  function onContextMenu(app, e) {
    selectedId.value = app.id;
    selectedIds.value = new Set([app.id]);
    menu.value.app = app;
    menu.value.x = e.clientX;
    menu.value.y = e.clientY;
    menu.value.items = [
      { key: 'open', label: '打开' },
      {
        key: 'toggleVisible',
        label: (app.isVisible ?? app.is_visible) ? '隐藏' : '显示',
      },
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
        await setVisible(app.id, !(app.isVisible ?? app.is_visible));
        await fetchApps({ visible: true }, true);
      } catch {}
    }
  }

  function onMouseDown(app, e) {
    // 长按触发拖动（>150ms）
    const id = app.id;
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

  function finalizeDrag(idOrIds) {
    finalizeDragForPositions(positions, idOrIds);
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

  // 外部接口：设置多选
  function setSelectedIds(ids = []) {
    selectedIds.value = new Set(ids.map(i => Number(i)));
    if (ids.length === 1) selectedId.value = ids[0];
  }

  defineExpose({ autoArrange, setSelectedIds });

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
    gridSavePositionsToStorage(STORAGE_KEY, positions.value, visibleApps.value);
    return col + (row > 0 ? 1 : 0);
  }

  onMounted(async () => {
    await fetchApps({ visible: true }, true);
    positions.value = gridLoadPositionsToStorage
      ? gridLoadPositionsToStorage(STORAGE_KEY, visibleApps.value)
      : {};
    // NOTE: ensure alias name matches the composable alias
    positions.value = gridLoadPositionsToStorage
      ? gridLoadPositionsToStorage(STORAGE_KEY, visibleApps.value)
      : {};
  });

  // 当 apps 列表更新后，重新加载已保存的位置（例如从后端异步拉取完成）
  watch(apps, () => {
    positions.value = gridLoadPositionsToStorage
      ? gridLoadPositionsToStorage(STORAGE_KEY, visibleApps.value)
      : {};
  });

  // 将位置持久化到 localStorage
  function savePositionsToStorage() {
    try {
      gridSavePositionsToStorage(
        STORAGE_KEY,
        positions.value,
        visibleApps.value
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('AppIcons.savePositionsToStorage error', e);
    }
  }

  function loadPositionsFromStorage() {
    try {
      positions.value = gridLoadPositionsToStorage
        ? gridLoadPositionsToStorage(STORAGE_KEY, visibleApps.value)
        : {};
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('AppIcons.loadPositionsFromStorage error', e);
    }
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
