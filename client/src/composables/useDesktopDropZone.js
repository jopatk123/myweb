import { ref } from 'vue';

/**
 * 桌面拖拽上传区域逻辑
 * 负责处理 dragover/leave/drop 并调用上传回调
 */
export function useDesktopDropZone({ upload, onError } = {}) {
  const dragOver = ref(false);

  const MAX_DESKTOP_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1GiB

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

    const oversize = droppedFiles.find(
      f => (f?.size || 0) > MAX_DESKTOP_UPLOAD_SIZE
    );
    if (oversize) {
      const err = new Error(
        `文件过大：${oversize.name || 'unknown'}（最大允许 1G）`
      );
      err.code = 'DESKTOP_UPLOAD_TOO_LARGE';
      throw err;
    }

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
