<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" ref="modalRef" :style="modalStyle" @click.stop>
      <div class="modal-header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <h3>编辑壁纸</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>名称：</label>
          <input type="text" v-model="localName" />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')">
            取消
          </button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';

  const props = defineProps({ wallpaper: { type: Object, required: true } });
  const emit = defineEmits(['close', 'saved']);

  const { updateWallpaper } = useWallpaper();

  const { modalRef, modalStyle, onHeaderPointerDown } =
    useDraggableModal('wallpaperEditPos');

  const localName = ref(
    props.wallpaper.name ||
      props.wallpaper.originalName ||
      props.wallpaper.original_name ||
      ''
  );
  const saving = ref(false);
  const error = ref('');

  watch(
    () => props.wallpaper,
    w => {
      localName.value = w.name || w.original_name || '';
    }
  );

  const save = async () => {
    if (!localName.value.trim()) {
      error.value = '名称不能为空';
      return;
    }
    saving.value = true;
    error.value = '';
    try {
      await updateWallpaper(props.wallpaper.id, {
        name: localName.value.trim(),
      });
      emit('saved');
    } catch (err) {
      error.value = err.message || '保存失败';
    } finally {
      saving.value = false;
    }
  };
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
    max-width: 480px;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #eee;
    cursor: move;
    user-select: none;
  }
  .modal-body {
    padding: 16px;
  }
  .form-group {
    margin-bottom: 16px;
  }
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }
  .form-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  .error-message {
    background: #fee;
    color: #c33;
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .btn {
    padding: 8px 16px;
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
