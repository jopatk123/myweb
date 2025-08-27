<template>
  <div class="image-preview">
    <div class="image-grid" :class="{ 'single-image': images.length === 1 }">
      <div 
        v-for="(image, index) in images" 
        :key="index"
        class="image-item"
        @click="openLightbox(index)"
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

    <!-- 图片查看器 -->
    <div v-if="showLightbox" class="lightbox" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <button class="lightbox-close" @click="closeLightbox">✕</button>
        <button 
          v-if="images.length > 1" 
          class="lightbox-nav lightbox-prev" 
          @click="prevImage"
        >
          ‹
        </button>
        <button 
          v-if="images.length > 1" 
          class="lightbox-nav lightbox-next" 
          @click="nextImage"
        >
          ›
        </button>
        
        <div class="lightbox-image-container">
          <img 
            :src="getImageUrl(images[currentImageIndex])" 
            :alt="images[currentImageIndex]?.originalName || '图片'"
            class="lightbox-image"
          />
        </div>
        
        <div v-if="images.length > 1" class="lightbox-indicators">
          <span 
            v-for="(image, index) in images" 
            :key="index"
            class="indicator"
            :class="{ active: index === currentImageIndex }"
            @click="currentImageIndex = index"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
});

const showLightbox = ref(false);
const currentImageIndex = ref(0);

// 获取图片URL
const getImageUrl = (image) => {
  if (image.path) {
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3002';
    return apiBase.endsWith('/') ? `${apiBase}${image.path}` : `${apiBase}/${image.path}`;
  }
  return image.url || image;
};

// 打开图片查看器
const openLightbox = (index) => {
  currentImageIndex.value = index;
  showLightbox.value = true;
  document.body.style.overflow = 'hidden';
};

// 关闭图片查看器
const closeLightbox = () => {
  showLightbox.value = false;
  document.body.style.overflow = '';
};

// 上一张图片
const prevImage = () => {
  currentImageIndex.value = currentImageIndex.value > 0 
    ? currentImageIndex.value - 1 
    : props.images.length - 1;
};

// 下一张图片
const nextImage = () => {
  currentImageIndex.value = currentImageIndex.value < props.images.length - 1 
    ? currentImageIndex.value + 1 
    : 0;
};

// 图片加载完成
const onImageLoad = () => {
  // 可以在这里添加加载完成的处理逻辑
};

// 图片加载失败
const onImageError = (event) => {
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNEN0Q3RDciLz4KPHBhdGggZD0iTTQwIDQwSDUwVjUwSDQwVjQwWiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K';
};

// 键盘事件处理
const handleKeydown = (event) => {
  if (!showLightbox.value) return;
  
  switch (event.key) {
    case 'Escape':
      closeLightbox();
      break;
    case 'ArrowLeft':
      prevImage();
      break;
    case 'ArrowRight':
      nextImage();
      break;
  }
};

// 监听键盘事件
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.image-preview {
  margin-top: 8px;
}

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
  transition: transform 0.2s, box-shadow 0.2s;
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
