<template>
  <div class="image-grid" :class="{ 'single-image': images.length === 1 }">
    <div
      v-for="(image, index) in images"
      :key="index"
      class="image-item"
      @click="$emit('image-click', index)"
      @contextmenu.prevent="$emit('context-menu', $event, image, index)"
    >
      <img
        :src="getImageUrl(image)"
        :alt="image.originalName || '图片'"
        @load="onImageLoad"
        @error="onImageError"
      />
      <div class="image-overlay">
        <span class="view-icon">👁️</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useImagePreview } from '@/composables/useImagePreview';

  defineProps({
    images: {
      type: Array,
      default: () => [],
    },
  });

  defineEmits(['image-click', 'context-menu']);

  const { getImageUrl, onImageLoad, onImageError } = useImagePreview();
</script>

<style scoped>
  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    max-width: 100%;
  }

  .image-grid.single-image {
    grid-template-columns: 1fr;
    max-width: 300px;
  }

  .image-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .image-item:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .image-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .image-item:hover .image-overlay {
    opacity: 1;
  }

  .view-icon {
    font-size: 20px;
    color: white;
  }
</style>
