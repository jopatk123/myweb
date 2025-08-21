<template>
  <div class="modal-backdrop" v-if="modelValue">
    <div class="modal" ref="modalRef" :style="modalStyle">
      <div class="modal-header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <div class="title">{{ title }}</div>
        <button class="close" @click="$emit('update:modelValue', false)">✖</button>
      </div>
      <div class="modal-body">
        <component :is="component" v-if="component" />
        <div v-else class="empty">未找到应用组件</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  component: { type: [Object, Function], default: null },
  title: { type: String, default: '' },
  storageKey: { type: String, default: '' }
});
defineEmits(['update:modelValue']);

const modalRef = ref(null);
const pos = ref({ x: null, y: null });
let dragging = false;
let dragStart = null;

const modalStyle = computed(() => ({
  position: 'absolute',
  left: pos.value.x !== null ? `${pos.value.x}px` : undefined,
  top: pos.value.y !== null ? `${pos.value.y}px` : undefined
}));

function centerModal() {
  if (!modalRef.value) return;
  const el = modalRef.value;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  pos.value = { x: Math.max(10, (window.innerWidth - w) / 2), y: Math.max(10, (window.innerHeight - h) / 2) };
}

function storageKey() {
  return props.storageKey ? `launcherPos:${props.storageKey}` : 'launcherPos:default';
}

function loadPosition() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      const v = JSON.parse(raw);
      if (typeof v?.x === 'number' && typeof v?.y === 'number') {
        pos.value = v;
      }
    }
  } catch {}
}

function savePosition() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(pos.value));
  } catch {}
}

function onHeaderPointerDown(e) {
  if (e.button !== 0) return;
  dragging = true;
  dragStart = { x: e.clientX, y: e.clientY, originX: pos.value.x, originY: pos.value.y };
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

watch(() => props.modelValue, (val) => {
  if (val) {
    nextTick().then(() => {
      if (pos.value.x === null || pos.value.y === null) centerModal();
    });
  }
});
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { background: #fff; width: 520px; max-width: 95vw; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #eee; }
.title { font-weight: 600; }
.close { border: none; background: none; cursor: pointer; font-size: 16px; }
.modal-body { padding: 12px; }
.empty { color: #888; text-align: center; padding: 40px 0; }
</style>


