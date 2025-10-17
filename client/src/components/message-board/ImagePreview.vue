<template>
  <div class="image-preview">
    <ImageGrid
      :images="images"
      @image-click="openLightbox"
      @context-menu="showContextMenu"
    />

    <!-- 图片查看器 -->
    <LightboxViewer
      :visible="showLightbox"
      :images="images"
      :current-index="currentImageIndex"
      @close="closeLightbox"
      @prev="prevImage"
      @next="nextImage"
      @save="saveImage"
      @select="setCurrentImageIndex"
    />

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenuVisible"
      :position="contextMenuPosition"
      @action="handleContextMenuAction"
    />
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue';
  import ImageGrid from './ImageGrid.vue';
  import LightboxViewer from './LightboxViewer.vue';
  import ContextMenu from './ContextMenu.vue';
  import { useLightbox } from '@/composables/useLightbox';
  import { useContextMenu } from '@/composables/useContextMenu';
  import { useImageDownload } from '@/composables/useImageDownload';
  import { useImagePreview } from '@/composables/useImagePreview';

  const props = defineProps({
    images: {
      type: Array,
      default: () => [],
    },
  });

  // 使用各个 composables
  const {
    showLightbox,
    currentImageIndex,
    openLightbox: openLightboxBase,
    closeLightbox: closeLightboxBase,
    prevImage: prevImageBase,
    nextImage: nextImageBase,
    setCurrentImageIndex,
  } = useLightbox();

  const {
    contextMenuVisible,
    contextMenuPosition,
    showContextMenu: showContextMenuBase,
    handleContextMenuAction: handleContextMenuActionBase,
  } = useContextMenu();

  const { saveImage: saveImageBase } = useImageDownload();
  const { getImageUrl } = useImagePreview();

  // 包装方法以适配组件接口
  const openLightbox = index => {
    openLightboxBase(index);
  };

  const closeLightbox = () => {
    closeLightboxBase();
  };

  const prevImage = () => {
    prevImageBase(props.images.length);
  };

  const nextImage = () => {
    nextImageBase(props.images.length);
  };

  const saveImage = image => {
    saveImageBase(image, getImageUrl);
  };

  const showContextMenu = (event, image, index) => {
    showContextMenuBase(event, { image, index });
  };

  const handleContextMenuAction = action => {
    const handlers = {
      save: target => saveImage(target.image),
      view: target => openLightbox(target.index),
    };
    handleContextMenuActionBase(action, handlers);
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
        saveImage(props.images[currentImageIndex.value]);
        break;
    }
  };

  // 监听键盘事件
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

  /* 保存成功提示样式 */
  :global(.save-success-tip) {
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
</style>

<style>
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
</style>
