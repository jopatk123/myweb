import { computed, ref } from 'vue';
import { processImageFile } from '@/composables/useImageProcessing.js';
import { useWallpaper } from '@/composables/useWallpaper.js';

const DEFAULT_LIMITS = Object.freeze({
  minWidth: 800,
  minHeight: 600,
  maxWidth: 7680,
  maxHeight: 4320,
  maxSizeMB: 10,
});

const buildNameFromFile = fileName => {
  if (!fileName) return '';
  const segments = fileName.split('.');
  return segments.length > 1 ? segments.slice(0, -1).join('.') : fileName;
};

export function useWallpaperUploader(options = {}) {
  const {
    multiple = false,
    limits = {},
    uploadFn: injectedUploadFn,
    processFileFn = processImageFile,
    stopOnError = !multiple,
  } = options;

  const resolvedLimits = { ...DEFAULT_LIMITS, ...limits };
  const { uploadWallpaper } = useWallpaper();
  const uploadFn = injectedUploadFn || uploadWallpaper;

  const selectedGroupId = ref('');
  const files = ref([]);
  const wallpaperName = ref('');
  const uploading = ref(false);
  const error = ref('');

  const overallProgress = computed(() => {
    if (files.value.length === 0) return 0;
    const total = files.value.reduce(
      (acc, item) => acc + (item.progress || 0),
      0
    );
    return Math.round(total / files.value.length);
  });

  const hasFiles = computed(() => files.value.length > 0);

  const reset = () => {
    files.value = [];
    wallpaperName.value = '';
    uploading.value = false;
    error.value = '';
  };

  const handleFiles = async fileList => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    error.value = '';

    if (!multiple) {
      files.value = [];
    }

    for (const file of incoming) {
      try {
        const processed = await processFileFn(file, resolvedLimits);
        const item = {
          ...processed,
          progress: 0,
          displayName: processed.name,
        };

        if (!multiple) {
          wallpaperName.value = buildNameFromFile(processed.name);
        }

        files.value.push(item);
      } catch (err) {
        console.warn('处理图片失败:', err);
        const message = err?.message || '处理图片时出错，请重试';
        if (!multiple) {
          error.value = message;
          break;
        }
        error.value = message.includes('部分')
          ? message
          : '部分文件处理失败，已跳过';
        if (stopOnError) {
          break;
        }
      }
    }
  };

  const removeFile = index => {
    files.value.splice(index, 1);
    if (!multiple && files.value.length === 0) {
      wallpaperName.value = '';
    }
  };

  const resolveFileName = item => {
    if (multiple) {
      return item.displayName || item.name || '';
    }
    return wallpaperName.value || buildNameFromFile(item.name);
  };

  const upload = async () => {
    if (files.value.length === 0 || uploading.value) return;

    uploading.value = true;
    error.value = '';

    try {
      for (const item of files.value) {
        item.progress = 0;
        await uploadFn(
          item.file,
          selectedGroupId.value || null,
          resolveFileName(item),
          progress => {
            item.progress = Math.floor(progress);
          }
        );
        item.progress = 100;
      }
    } catch (err) {
      console.error('上传壁纸失败:', err);
      error.value = err?.message || (multiple ? '批量上传失败' : '上传失败');
      throw err;
    } finally {
      uploading.value = false;
    }
  };

  return {
    // state
    selectedGroupId,
    files,
    wallpaperName,
    uploading,
    error,
    // computed
    hasFiles,
    overallProgress,
    // actions
    handleFiles,
    removeFile,
    upload,
    reset,
  };
}
