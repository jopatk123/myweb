<template>
  <div class="image-preview">
    <div class="image-grid" :class="{ 'single-image': images.length === 1 }">
      <div
        v-for="(image, index) in images"
        :key="index"
        class="image-item"
        @click="openLightbox(index)"
        @contextmenu.prevent="showContextMenu($event, image, index)"
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
          <!-- 保存图片按钮 -->
          <button
            @click="saveImage(images[currentImageIndex])"
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
            :class="{ active: index === currentImageIndex }"
            @click="currentImageIndex = index"
          ></span>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{
        left: contextMenuPosition.x + 'px',
        top: contextMenuPosition.y + 'px',
      }"
    >
      <div class="context-menu-item" @click="handleContextMenuAction('view')">
        <span class="context-menu-icon">👁️</span>
        查看图片
      </div>
      <div class="context-menu-item" @click="handleContextMenuAction('save')">
        <span class="context-menu-icon">💾</span>
        保存图片
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue';

  const props = defineProps({
    images: {
      type: Array,
      default: () => [],
    },
  });

  const showLightbox = ref(false);
  const currentImageIndex = ref(0);
  const contextMenu = ref(null);
  const contextMenuVisible = ref(false);
  const contextMenuPosition = ref({ x: 0, y: 0 });
  const contextMenuTarget = ref(null);

  // 获取图片URL
  const getImageUrl = image => {
    if (image.path) {
      // 如果路径以 uploads/ 开头，直接使用相对路径（不添加API前缀）
      if (image.path.startsWith('uploads/')) {
        return `/${image.path}`;
      }
      // 其他路径使用API前缀
      const apiBase = import.meta.env.VITE_API_BASE || '';
      return apiBase.endsWith('/')
        ? `${apiBase}${image.path}`
        : `${apiBase}/${image.path}`;
    }
    return image.url || image;
  };

  // 打开图片查看器
  const openLightbox = index => {
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
    currentImageIndex.value =
      currentImageIndex.value > 0
        ? currentImageIndex.value - 1
        : props.images.length - 1;
  };

  // 下一张图片
  const nextImage = () => {
    currentImageIndex.value =
      currentImageIndex.value < props.images.length - 1
        ? currentImageIndex.value + 1
        : 0;
  };

  // 图片加载完成
  const onImageLoad = () => {
    // 可以在这里添加加载完成的处理逻辑
  };

  // 图片加载失败
  const onImageError = event => {
    event.target.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNEN0Q3RDciLz4KPHBhdGggZD0iTTQwIDQwSDUwVjUwSDQwVjQwWiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K';
  };

  // 保存图片
  const saveImage = async image => {
    try {
      const imageUrl = getImageUrl(image);
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error('图片下载失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;

      // 生成文件名
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      const originalName = image.originalName || 'image';
      const extension = originalName.includes('.')
        ? originalName.split('.').pop()
        : 'jpg';
      const fileName = `message-image-${timestamp}.${extension}`;

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 清理URL
      URL.revokeObjectURL(url);

      // 显示成功提示
      showSaveSuccess();
    } catch (error) {
      console.error('保存图片失败:', error);
      alert('保存图片失败: ' + error.message);
    }
  };

  // 显示保存成功提示
  const showSaveSuccess = () => {
    // 创建一个临时的成功提示
    const successTip = document.createElement('div');
    successTip.className = 'save-success-tip';
    successTip.textContent = '图片已保存';
    document.body.appendChild(successTip);

    // 2秒后移除提示
    setTimeout(() => {
      if (successTip.parentNode) {
        successTip.parentNode.removeChild(successTip);
      }
    }, 2000);
  };

  // 显示右键菜单
  const showContextMenu = (event, image, index) => {
    event.preventDefault();
    contextMenuPosition.value = { x: event.clientX, y: event.clientY };
    contextMenuTarget.value = { image, index };
    contextMenuVisible.value = true;

    // 点击其他地方关闭菜单
    const closeMenu = () => {
      contextMenuVisible.value = false;
      document.removeEventListener('click', closeMenu);
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  };

  // 处理右键菜单操作
  const handleContextMenuAction = action => {
    if (!contextMenuTarget.value) return;

    const { image, index } = contextMenuTarget.value;

    switch (action) {
      case 'save':
        saveImage(image);
        break;
      case 'view':
        openLightbox(index);
        break;
    }

    contextMenuVisible.value = false;
  };

  // 键盘事件处理
  const handleKeydown = event => {
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
      case 's':
      case 'S':
        // 按S键保存当前图片
        saveImage(images[currentImageIndex.value]);
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

  .save-success-tip {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .context-menu {
    position: fixed;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    min-width: 150px;
    overflow: hidden;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 14px;
  }

  .context-menu-item:hover {
    background: #f8f9fa;
  }

  .context-menu-icon {
    font-size: 16px;
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
