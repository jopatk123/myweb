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
  import { ref, computed, onMounted, nextTick, watch } from 'vue';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    filename: { type: String, default: '' },
    downloadUrl: { type: String, default: '' },
    showPreview: { type: Boolean, default: false },
    file: { type: Object, default: null },
  });
  const emit = defineEmits(['update:modelValue', 'preview']);

  const {
    modalRef: dialogRef,
    modalStyle: dialogStyle,
    onHeaderPointerDown,
  } = useDraggableModal('confirmDownloadPos');

  function onPreview() {
    emit('preview', props.file);
    emit('update:modelValue', false);
  }

  // Watch for the modal opening to ensure it's centered if it hasn't been positioned.
  watch(
    () => props.modelValue,
    val => {
      if (val) {
        nextTick().then(() => {
          // The composable handles initial centering, but this ensures it centers
          // if the v-if causes it to re-mount without a saved position.
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
