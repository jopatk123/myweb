<template>
  <div v-if="visible" class="lightbox" @click="$emit('close')">
    <div class="lightbox-content" @click.stop>
      <button class="lightbox-close" @click="$emit('close')">✕</button>
      <button
        v-if="images.length > 1"
        class="lightbox-nav lightbox-prev"
        @click="$emit('prev')"
      >
        ‹
      </button>
      <button
        v-if="images.length > 1"
        class="lightbox-nav lightbox-next"
        @click="$emit('next')"
      >
        ›
      </button>

      <div class="lightbox-image-container">
        <img
          :src="getImageUrl(images[currentIndex])"
          :alt="images[currentIndex]?.originalName || '图片'"
          class="lightbox-image"
        />
        <!-- 保存图片按钮 -->
        <button
          @click="$emit('save', images[currentIndex])"
          class="save-image-btn"
          title="保存图片"
        >
          💾
        </button>
      </div>

      <div v-if="images.length > 1" class="lightbox-indicators">
        <span
          v-for="(image, index) in images"
          :key="index"
          class="indicator"
          :class="{ active: index === currentIndex }"
          @click="$emit('select', index)"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useImagePreview } from '@/composables/useImagePreview';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  images: {
    type: Array,
    default: () => [],
  },
  currentIndex: {
    type: Number,
    default: 0,
  },
});

defineEmits(['close', 'prev', 'next', 'save', 'select']);

const { getImageUrl } = useImagePreview();
</script>

<style scoped>
/* 图片查看器样式 */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  z-index: 1;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 16px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lightbox-prev {
  left: -60px;
}

.lightbox-next {
  right: -60px;
}

.lightbox-image-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}

.save-image-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  z-index: 10;
}

.save-image-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.lightbox-indicators {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background-color 0.2s;
}

.indicator.active {
  background: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .lightbox-nav {
    padding: 12px 6px;
    font-size: 20px;
  }

  .lightbox-prev {
    left: 10px;
  }

  .lightbox-next {
    right: 10px;
  }

  .lightbox-close {
    top: 10px;
    right: 10px;
  }
}
</style>
