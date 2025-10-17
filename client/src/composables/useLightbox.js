import { ref } from 'vue';

export function useLightbox() {
  const showLightbox = ref(false);
  const currentImageIndex = ref(0);

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
  const prevImage = totalImages => {
    currentImageIndex.value =
      currentImageIndex.value > 0
        ? currentImageIndex.value - 1
        : totalImages - 1;
  };

  // 下一张图片
  const nextImage = totalImages => {
    currentImageIndex.value =
      currentImageIndex.value < totalImages - 1
        ? currentImageIndex.value + 1
        : 0;
  };

  // 设置当前图片索引
  const setCurrentImageIndex = index => {
    currentImageIndex.value = index;
  };

  return {
    showLightbox,
    currentImageIndex,
    openLightbox,
    closeLightbox,
    prevImage,
    nextImage,
    setCurrentImageIndex,
  };
}
