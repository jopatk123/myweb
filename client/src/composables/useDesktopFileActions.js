import { computed, ref, watch } from 'vue';

/**
 * 管理桌面文件打开、预览、下载确认等状态
 */
export function useDesktopFileActions({
  getDownloadUrl,
  openFilePreviewWindow,
  createWindow,
  FilePreviewWindow,
} = {}) {
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

    // 预览类文件直接打开内置窗口
    if (file.__preview && typeof openFilePreviewWindow === 'function') {
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
    if (file && typeof createWindow === 'function' && FilePreviewWindow) {
      createWindow({
        component: FilePreviewWindow,
        title: file.originalName || file.original_name || '文件预览',
        appSlug: 'filePreview',
        width: Math.min(1200, window.innerWidth * 0.9),
        height: Math.min(800, window.innerHeight * 0.9),
        props: { file },
        storageKey: `previewPos:${file.id}`,
      });
      return;
    }

    previewFile.value = file || null;
    showPreview.value = true;
  }

  function closePreview() {
    showPreview.value = false;
    previewFile.value = null;
  }

  watch(showPreview, value => {
    if (!value) {
      previewFile.value = null;
    }
  });

  const canPreviewSelected = computed(() => {
    const file = selectedFile.value || {};
    const typeCategory = String(file.type_category || file.typeCategory || '')
      .toLowerCase()
      .trim();

    if (['image', 'video', 'word', 'excel'].includes(typeCategory)) {
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

    return /\.(png|jpe?g|gif|bmp|webp|svg|avif|mp4|webm|ogg|ogv|mov|mkv|docx?|xlsx?|xlsm|xlsb)$/i.test(
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
