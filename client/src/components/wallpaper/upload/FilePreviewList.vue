<template>
  <div v-if="items.length > 0" class="file-preview">
    <div v-for="(item, index) in items" :key="index" class="preview-item">
      <img :src="item.preview" :alt="item.name" />
      <div class="preview-info">
        <p class="file-name">{{ item.name }}</p>
        <p class="file-size">
          {{ formatFileSize(item.size) }}
          <span v-if="item.wasCompressed" class="compressed-info">
            (原始: {{ formatFileSize(item.originalSize) }})
          </span>
        </p>
        <p v-if="item.width && item.height" class="file-resolution">
          {{ item.width }}x{{ item.height }}
          <span v-if="item.wasCompressed" class="compressed-info">
            (原始: {{ item.originalWidth }}x{{ item.originalHeight }})
          </span>
        </p>
        <p v-if="item.wasCompressed" class="compression-notice">已自动压缩</p>
      </div>
      <button type="button" @click="$emit('remove', index)" class="remove-btn">
        &times;
      </button>
    </div>
  </div>
</template>

<script setup>
  import { formatFileSize } from '@/composables/useImageProcessing.js';

  defineProps({
    items: { type: Array, default: () => [] },
  });

  defineEmits(['remove']);
</script>

<style scoped>
  .file-preview {
    margin-top: 20px;
  }
  .preview-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 4px;
    margin-bottom: 10px;
  }
  .preview-item img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
  }
  .preview-info {
    flex: 1;
  }
  .file-name {
    margin: 0 0 4px 0;
    font-weight: 500;
    color: #333;
  }
  .file-size {
    margin: 0;
    font-size: 12px;
    color: #666;
  }
  .file-resolution {
    margin: 0;
    font-size: 12px;
    color: #007bff;
    font-weight: 500;
  }
  .compressed-info {
    color: #666;
    font-weight: normal;
  }
  .compression-notice {
    margin: 0;
    font-size: 11px;
    color: #28a745;
    font-weight: 500;
  }
  .remove-btn {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }
  .remove-btn:hover {
    background: #c82333;
  }
</style>
