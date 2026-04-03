import { computed, ref, watch } from 'vue';
import { openFilePreviewWindow } from '@/utils/openFilePreview.js';

/**
 * 管理桌面文件打开、预览、下载确认等状态。
 * 预览窗口统一通过 openFilePreviewWindow 工具函数创建，无需额外注入。
 */
export function useDesktopFileActions({ getDownloadUrl } = {}) {
  const showConfirm = ref(false);
  const selectedFileName = ref('');
  const selectedDownloadUrl = ref('');
  const selectedFile = ref(null);
  const showPreview = ref(false);
  const previewFile = ref(null);

  function resetConfirmState() {
    selectedFileName.value = '';
    selectedDownloadUrl.value = '';
    selectedFile.value = null;
  }

  function openFile(file) {
    if (!file) return;

    // 预览类文件直接打开桌面窗口
    if (file.__preview) {
      openFilePreviewWindow(file);
      return;
    }

    selectedFile.value = file;
    selectedFileName.value =
      file.originalName || file.original_name || file.name || '';

    if (typeof getDownloadUrl === 'function') {
      selectedDownloadUrl.value = getDownloadUrl(file.id);
    }

    showConfirm.value = true;
  }

  function handlePreviewFromConfirm(file) {
    // 统一使用工具函数，不再重复窗口创建逻辑
    openFilePreviewWindow(file);
  }

  function closePreview() {
    showPreview.value = false;
    previewFile.value = null;
  }

  watch(showPreview, value => {
    if (!value) previewFile.value = null;
  });

  const canPreviewSelected = computed(() => {
    const file = selectedFile.value || {};
    const typeCategory = String(file.typeCategory || file.type_category || '')
      .toLowerCase()
      .trim();

    if (
      ['image', 'video', 'word', 'excel', 'text', 'code'].includes(typeCategory)
    ) {
      return true;
    }

    const name = String(
      file.originalName ||
        file.original_name ||
        file.storedName ||
        file.stored_name ||
        file.filePath ||
        file.file_path ||
        ''
    );

    return /\.(png|jpe?g|gif|bmp|webp|svg|avif|mp4|webm|ogg|ogv|mov|mkv|docx?|xlsx?|xlsm|xlsb|txt|json)$/i.test(
      name
    );
  });

  return {
    showConfirm,
    selectedFileName,
    selectedDownloadUrl,
    selectedFile,
    showPreview,
    previewFile,
    canPreviewSelected,
    openFile,
    handlePreviewFromConfirm,
    closePreview,
    resetConfirmState,
  };
}
