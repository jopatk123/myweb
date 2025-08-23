<template>
  <div v-if="modelValue" class="backdrop">
    <div class="dialog" ref="dialogRef" :style="dialogStyle">
      <div class="title" @pointerdown.stop.prevent="onHeaderPointerDown">
        确认下载
      </div>
      <div class="content">是否下载文件「{{ filename }}」？</div>
      <div class="actions">
        <button @click="$emit('update:modelValue', false)">取消</button>
        <button v-if="showPreview" @click="onPreview" class="secondary">
          预览
        </button>
        <a
          :href="downloadUrl"
          @click="$emit('update:modelValue', false)"
          class="primary"
          >下载</a
        >
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, nextTick, computed } from 'vue';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    filename: { type: String, default: '' },
    downloadUrl: { type: String, default: '' },
    showPreview: { type: Boolean, default: false },
    file: { type: Object, default: null },
  });
  const emit = defineEmits(['update:modelValue', 'preview']);

  const dialogRef = ref(null);
  const pos = ref({ x: null, y: null });
  let dragging = false;
  let dragStart = null;

  const dialogStyle = computed(() => ({
    position: 'absolute',
    left: pos.value.x !== null ? `${pos.value.x}px` : undefined,
    top: pos.value.y !== null ? `${pos.value.y}px` : undefined,
  }));

  function centerDialog() {
    if (!dialogRef.value) return;
    const el = dialogRef.value;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    pos.value = {
      x: Math.max(10, (window.innerWidth - w) / 2),
      y: Math.max(10, (window.innerHeight - h) / 2),
    };
  }

  function storageKey() {
    return 'confirmDownloadPos';
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

  function onPreview() {
    emit('preview', props.file);
    emit('update:modelValue', false);
  }

  onMounted(async () => {
    await nextTick();
    loadPosition();
    if (pos.value.x === null || pos.value.y === null) {
      centerDialog();
    }
  });

  watch(
    () => props.modelValue,
    val => {
      if (val) {
        nextTick().then(() => {
          if (pos.value.x === null || pos.value.y === null) centerDialog();
        });
      }
    }
  );
</script>

<style scoped>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog {
    width: 360px;
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
  .title {
    font-weight: 600;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    cursor: move;
    user-select: none;
  }
  .content {
    padding: 16px;
    color: #333;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 10px 16px;
    border-top: 1px solid #eee;
  }
  button,
  .primary {
    padding: 6px 12px;
    border: 1px solid #ddd;
    background: #f9f9f9;
    border-radius: 6px;
    cursor: pointer;
    text-decoration: none;
    color: #333;
  }
  .secondary {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
  }
  .primary {
    background: #16a34a;
    color: #fff;
    border-color: #16a34a;
  }
</style>
