<template>
  <div class="desktop-icons" @mousedown.stop>
    <div
      v-for="app in visibleApps"
      :key="app.id"
      class="icon-item"
      :class="{ selected: selectedId === app.id }"
      @click="onClick(app, $event)"
      @dblclick="onDblClick(app)"
      @mousedown="onMouseDown(app, $event)"
      :style="getIconStyle(app)"
    >
      <img v-if="app.icon_filename" :src="getAppIconUrl(app)" class="icon" />
      <div class="label">{{ app.name }}</div>
    </div>

    <AppLauncherModal v-model="show" :component="currentComponent" :title="currentTitle" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useApps } from '@/composables/useApps.js';
import { getAppComponentBySlug, getAppMetaBySlug } from '@/apps/registry.js';
import AppLauncherModal from './AppLauncherModal.vue';

const { apps, fetchApps, getAppIconUrl } = useApps();

const show = ref(false);
const currentComponent = ref(null);
const currentTitle = ref('');
const selectedId = ref(null);
const positions = ref({}); // { [appId]: { x, y } }
const STORAGE_KEY = 'desktopIconPositions';
let dragState = null; // { id, startX, startY, originX, originY, longPressTimer }

const visibleApps = computed(() => (apps.value || []).filter(a => a.is_visible));

function open(app) {
  const comp = getAppComponentBySlug(app.slug);
  const meta = getAppMetaBySlug(app.slug);
  currentComponent.value = comp;
  currentTitle.value = meta?.name || app.name || '';
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
    dragging: false
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
    [dragState.id]: { x: dragState.originX + dx, y: dragState.originY + dy }
  };
}

function onMouseUp() {
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

function getIconStyle(app) {
  const p = positions.value[app.id];
  if (!p) return undefined;
  return {
    position: 'fixed',
    left: `${p.x}px`,
    top: `${p.y}px`
  };
}

onMounted(async () => {
  await fetchApps({ visible: true }, true);
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
      if (validIds.has(Number(k)) && v && typeof v.x === 'number' && typeof v.y === 'number') {
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
.desktop-icons { position: absolute; top: 20px; left: 20px; display: grid; grid-template-columns: repeat(auto-fill, 72px); gap: 16px; z-index: 2; }
.icon-item { width: 72px; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: default; user-select: none; }
.icon-item.selected .label { background: rgba(255,255,255,0.2); border-radius: 6px; padding: 2px 4px; }
.icon { width: 48px; height: 48px; object-fit: contain; }
.label { color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.6); font-size: 12px; text-align: center; }
</style>


