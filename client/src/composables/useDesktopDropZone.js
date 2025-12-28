import { ref } from 'vue';
import { formatFileSize, UPLOAD_SIZE_LIMITS } from '@/constants/fileTypes.js';

/**
 * 桌面拖拽上传区域逻辑
 * 负责处理 dragover/leave/drop 并调用上传回调
 */
export function useDesktopDropZone({ upload, onError, maxFileSize } = {}) {
  const dragOver = ref(false);
  const uploading = ref(false);
  const lastError = ref(null);

  const MAX_DESKTOP_UPLOAD_SIZE = maxFileSize || UPLOAD_SIZE_LIMITS.DEFAULT; // 默认 1GiB

  const toArray = files => Array.from(files || []);

  function onDragOver(event) {
    // 阻止默认行为以允许 drop
    if (event) {
      event.preventDefault();
    }
    dragOver.value = true;
  }

  function onDragLeave(event) {
    // 检查是否真的离开了拖放区域
    if (
      event &&
      event.relatedTarget &&
      event.currentTarget?.contains(event.relatedTarget)
    ) {
      return;
    }
    dragOver.value = false;
  }

  /**
   * 验证文件列表
   * @param {File[]} files - 文件列表
   * @returns {{ valid: File[], errors: string[] }}
   */
  function validateFiles(files) {
    const valid = [];
    const errors = [];

    for (const file of files) {
      // 检查文件大小
      if ((file?.size || 0) > MAX_DESKTOP_UPLOAD_SIZE) {
        errors.push(
          `文件过大：${file.name || 'unknown'}（${formatFileSize(file.size)}，最大允许 ${formatFileSize(MAX_DESKTOP_UPLOAD_SIZE)}）`
        );
        continue;
      }

      // 检查文件名是否有效
      if (!file.name || file.name.trim() === '') {
        errors.push('检测到无效文件名');
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  }

  async function onDrop(event) {
    dragOver.value = false;
    lastError.value = null;

    const droppedFiles = toArray(event?.dataTransfer?.files);
    if (!droppedFiles.length) return;

    if (typeof upload !== 'function') {
      console.warn('[useDesktopDropZone] upload function not provided');
      return;
    }

    // 验证文件
    const { valid, errors } = validateFiles(droppedFiles);

    // 如果有验证错误，报告第一个错误
    if (errors.length > 0) {
      const err = new Error(errors[0]);
      err.code = 'DESKTOP_UPLOAD_VALIDATION_ERROR';
      err.errors = errors;
      lastError.value = err;

      if (typeof onError === 'function') {
        onError(err);
      } else {
        console.warn('[useDesktopDropZone] validation failed', errors);
      }

      // 如果没有有效文件，直接返回
      if (valid.length === 0) {
        return;
      }
    }

    // 上传有效的文件
    try {
      uploading.value = true;
      await upload(valid);
    } catch (error) {
      lastError.value = error;
      if (typeof onError === 'function') {
        onError(error);
      } else {
        console.warn('[useDesktopDropZone] upload failed', error);
      }
    } finally {
      uploading.value = false;
    }
  }

  /**
   * 重置状态
   */
  function reset() {
    dragOver.value = false;
    uploading.value = false;
    lastError.value = null;
  }

  return {
    dragOver,
    uploading,
    lastError,
    onDragOver,
    onDragLeave,
    onDrop,
    validateFiles,
    reset,
    MAX_DESKTOP_UPLOAD_SIZE,
  };
}
