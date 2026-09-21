import { ref } from 'vue';
import { formatFileSize, UPLOAD_SIZE_LIMITS } from '@/constants/fileTypes.js';
import {
  BLOCKED_EXECUTABLE_EXTENSIONS,
  BLOCKED_EXECUTABLE_MIME_TYPES,
} from '@shared/fileTypes.js';

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

  function isBlockedFile(file) {
    const mime = String(file?.type || '').toLowerCase();
    if (mime && BLOCKED_EXECUTABLE_MIME_TYPES.has(mime)) return true;

    const name = String(file?.name || '');
    const lastDot = name.lastIndexOf('.');
    if (lastDot !== -1) {
      const ext = name.slice(lastDot).toLowerCase();
      if (BLOCKED_EXECUTABLE_EXTENSIONS.has(ext)) return true;
    }
    return false;
  }

  /**
   * 从拖放数据中分离文件与文件夹。
   * 优先走 DataTransferItem，以便识别目录；不支持时退回 FileList。
   */
  function readDrop(event) {
    const items = event?.dataTransfer?.items;
    if (items && items.length) {
      const files = [];
      const directories = [];
      for (const item of Array.from(items)) {
        if (item.kind && item.kind !== 'file') continue;
        const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
        if (entry?.isDirectory) {
          directories.push(entry.name || '未命名文件夹');
          continue;
        }
        const file = item.getAsFile?.();
        if (file) files.push(file);
      }
      return { files, directories };
    }

    return {
      files: toArray(event?.dataTransfer?.files),
      directories: [],
    };
  }

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

      if (isBlockedFile(file)) {
        errors.push(`不支持的文件类型：${file.name}`);
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  }

  async function onDrop(event) {
    dragOver.value = false;
    lastError.value = null;

    const { files: droppedFiles, directories } = readDrop(event);
    const directoryErrors = directories.map(
      name => `暂不支持上传文件夹：${name}，请拖入文件`
    );
    if (!droppedFiles.length && !directoryErrors.length) return;

    if (typeof upload !== 'function') {
      console.warn('[useDesktopDropZone] upload function not provided');
      return;
    }

    // 验证文件
    const { valid, errors: fileErrors } = validateFiles(droppedFiles);
    const errors = [...directoryErrors, ...fileErrors];

    // 如果有验证错误，报告全部原因；合法文件仍继续上传
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
