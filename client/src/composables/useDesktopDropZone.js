import { ref } from 'vue';

/**
 * 桌面拖拽上传区域逻辑
 * 负责处理 dragover/leave/drop 并调用上传回调
 */
export function useDesktopDropZone({ upload, onError } = {}) {
  const dragOver = ref(false);

  const toArray = files => Array.from(files || []);

  function onDragOver() {
    dragOver.value = true;
  }

  function onDragLeave() {
    dragOver.value = false;
  }

  async function onDrop(event) {
    dragOver.value = false;
    const droppedFiles = toArray(event?.dataTransfer?.files);
    if (!droppedFiles.length || typeof upload !== 'function') return;

    try {
      await upload(droppedFiles);
    } catch (error) {
      if (typeof onError === 'function') {
        onError(error);
      } else {
        console.warn('[useDesktopDropZone] upload failed', error);
      }
    }
  }

  return {
    dragOver,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
