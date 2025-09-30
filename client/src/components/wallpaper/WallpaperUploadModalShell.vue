<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" ref="modalRef" :style="modalStyle" @click.stop>
      <div class="modal-header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <h3>
          <slot name="title">
            {{ title }}
          </slot>
        </h3>
        <button type="button" class="close-btn" @click="emit('close')">
          &times;
        </button>
      </div>

      <div class="modal-body">
        <slot />
      </div>

      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useDraggableModal } from '@/composables/useDraggableModal.js';

  const props = defineProps({
    title: { type: String, default: '' },
    storageKey: { type: String, required: true },
    closeOnOverlay: { type: Boolean, default: true },
  });

  const emit = defineEmits(['close']);

  const { modalRef, modalStyle, onHeaderPointerDown } = useDraggableModal(
    props.storageKey
  );

  const handleOverlayClick = () => {
    if (props.closeOnOverlay) {
      emit('close');
    }
  };
</script>

<style scoped>
  .modal-overlay {
    position: fixed;
    inset: 0;
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
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
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
    color: #333;
    font-size: 18px;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #333;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 0 20px 20px;
  }

  .modal-content :deep(.modal-actions) {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .modal-content :deep(.btn) {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
    box-shadow: 0 2px 6px rgba(16, 24, 40, 0.06);
  }

  .modal-content :deep(.btn:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .modal-content :deep(.btn-primary) {
    background: #007bff;
    color: white;
  }

  .modal-content :deep(.btn-primary:hover:not(:disabled)) {
    background: #0056b3;
  }

  .modal-content :deep(.btn-secondary) {
    background: #6c757d;
    color: white;
  }

  .modal-content :deep(.btn-secondary:hover) {
    background: #545b62;
  }
</style>
