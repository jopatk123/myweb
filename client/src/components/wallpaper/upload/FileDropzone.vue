<template>
  <div class="file-input-wrapper">
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="onNativeChange"
      class="file-input"
    />
    <div
      class="file-input-display"
      @click="openPicker"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      :class="{ 'drag-over': isDragOver }"
    >
      <slot>
        <span>点击选择文件或拖拽到此处</span>
      </slot>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue';

  const props = defineProps({
    accept: { type: String, default: 'image/*' },
    multiple: { type: Boolean, default: true },
  });

  const emit = defineEmits(['files-selected']);

  const fileInput = ref(null);
  const isDragOver = ref(false);

  const openPicker = () => {
    fileInput.value && fileInput.value.click();
  };

  const onNativeChange = e => {
    const files = e.target.files || [];
    if (files.length === 0) return;
    emit('files-selected', files);
  };

  const onDragOver = () => {
    isDragOver.value = true;
  };
  const onDragLeave = () => {
    isDragOver.value = false;
  };
  const onDrop = e => {
    isDragOver.value = false;
    const dtFiles =
      e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [];
    if (dtFiles.length === 0) return;
    emit('files-selected', dtFiles);
  };
</script>

<style scoped>
  .file-input-wrapper {
    position: relative;
  }
  .file-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .file-input-display {
    border: 2px dashed #ddd;
    border-radius: 4px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.3s ease;
  }
  .file-input-display.drag-over {
    border-color: #007bff;
    background: rgba(0, 123, 255, 0.04);
  }
  .file-input-display:hover {
    border-color: #007bff;
  }
  .file-input-display small {
    color: #666;
    font-size: 12px;
    margin-top: 8px;
    display: block;
  }
</style>
