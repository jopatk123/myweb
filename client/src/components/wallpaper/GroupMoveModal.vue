<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" ref="modalRef" :style="modalStyle" @click.stop>
      <div class="modal-header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <h3>移动壁纸</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <p>将 {{ count }} 张壁纸移动到：</p>
        <div class="form-group">
          <label>选择分组：</label>
          <select v-model="targetGroupId">
            <option :value="null">默认分组</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button @click="$emit('close')" class="btn btn-secondary">取消</button>
        <button
          @click="confirmMove"
          class="btn btn-primary"
          :disabled="loading"
        >
          {{ loading ? '移动中...' : '确认移动' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, nextTick, computed } from 'vue';

  defineProps({
    count: {
      type: Number,
      required: true,
    },
    groups: {
      type: Array,
      required: true,
    },
  });

  const emit = defineEmits(['close', 'confirm']);

  const modalRef = ref(null);
  const pos = ref({ x: null, y: null });
  let dragging = false;
  let dragStart = null;

  const modalStyle = computed(() => ({
    position: 'absolute',
    left: pos.value.x !== null ? `${pos.value.x}px` : undefined,
    top: pos.value.y !== null ? `${pos.value.y}px` : undefined,
  }));

  const targetGroupId = ref(null);
  const loading = ref(false);

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

  function storageKey() {
    return 'groupMovePos';
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

  const confirmMove = () => {
    loading.value = true;
    emit('confirm', targetGroupId.value);
  };

  onMounted(async () => {
    await nextTick();
    loadPosition();
    if (pos.value.x === null || pos.value.y === null) {
      centerModal();
    }
  });
</script>

<style scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 400px;
    overflow: hidden;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
    cursor: move;
    user-select: none;
  }
  .modal-header h3 {
    margin: 0;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
  }
  .modal-body {
    padding: 20px;
  }
  .form-group {
    margin-bottom: 16px;
  }
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }
  .form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #eee;
  }
  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-primary {
    background: #007bff;
    color: white;
  }
  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  .btn-secondary:hover {
    background: #545b62;
  }
</style>
