import { ref, computed, onScopeDispose } from 'vue';
import { filesApi } from '@/api/files.js';

export function useFiles() {
  const items = ref([]);
  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);
  const type = ref('');
  const search = ref('');
  const loading = ref(false);
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const uploadedBytes = ref(0);
  const totalBytes = ref(0);
  const currentFileName = ref('');
  const uploadQueue = ref([]);
  const error = ref('');
  const lastError = ref(null);
  let cleanupTimer = null;
  let isDisposed = false;

  const totalPages = computed(() =>
    Math.ceil((total.value || 0) / (limit.value || 1))
  );

  function unwrap(resp) {
    let r = resp;
    while (
      r &&
      typeof r === 'object' &&
      Object.prototype.hasOwnProperty.call(r, 'data')
    ) {
      r = r.data;
    }
    return r;
  }

  async function fetchList() {
    if (isDisposed) return;
    loading.value = true;
    try {
      error.value = '';
      lastError.value = null;
      const raw = await filesApi.list({
        page: page.value,
        limit: limit.value,
        type: type.value || undefined,
        search: (search.value || '').trim() || undefined,
      });
      const data = unwrap(raw);
      items.value = data.files || [];
      total.value = data.pagination?.total || 0;
    } catch (e) {
      lastError.value = e;
      error.value = e.message || '加载失败';
      throw e;
    } finally {
      if (!isDisposed) {
        loading.value = false;
      }
    }
  }

  async function upload(files) {
    if (isDisposed) return;

    uploading.value = true;
    uploadProgress.value = 0;
    uploadedBytes.value = 0;
    totalBytes.value = 0;
    currentFileName.value = '';
    uploadQueue.value = [];
    error.value = '';

    // 计算总文件大小和准备上传队列
    const fileArray = Array.isArray(files) ? files : [files];
    totalBytes.value = fileArray.reduce((sum, file) => sum + file.size, 0);
    uploadQueue.value = fileArray.map(file => ({
      name: file.name,
      size: file.size,
      progress: 0,
    }));

    try {
      lastError.value = null;
      let totalUploadedBytes = 0;

      // 逐个上传文件，更新进度
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        currentFileName.value = file.name;

        await filesApi.upload([file], progress => {
          if (isDisposed) return;
          // 计算当前文件的已上传字节数
          const currentFileUploaded = Math.round((progress / 100) * file.size);
          // 累积总上传字节数
          uploadedBytes.value = totalUploadedBytes + currentFileUploaded;
          // 计算总体进度
          uploadProgress.value = Math.round(
            (uploadedBytes.value / totalBytes.value) * 100
          );

          // 更新队列中当前文件的进度
          if (uploadQueue.value[i]) {
            uploadQueue.value[i].progress = progress;
          }
        });

        // 当前文件上传完成，更新队列进度为100%并累积字节数
        totalUploadedBytes += file.size;
        if (!isDisposed) {
          uploadedBytes.value = totalUploadedBytes;
          uploadProgress.value = Math.round(
            (uploadedBytes.value / totalBytes.value) * 100
          );

          if (uploadQueue.value[i]) {
            uploadQueue.value[i].progress = 100;
          }
        }
      }

      if (!isDisposed) {
        await fetchList();
      }
    } catch (e) {
      lastError.value = e;
      error.value = e.message || '上传失败';
      throw e;
    } finally {
      if (!isDisposed) {
        uploading.value = false;
        // 延迟清除进度信息，让用户看到完成状态
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
        }
        cleanupTimer = setTimeout(() => {
          if (isDisposed) return;
          uploadProgress.value = 0;
          uploadedBytes.value = 0;
          totalBytes.value = 0;
          currentFileName.value = '';
          uploadQueue.value = [];
          cleanupTimer = null;
        }, 2000);
      }
    }
  }

  async function remove(id) {
    if (isDisposed) return;
    try {
      lastError.value = null;
      await filesApi.delete(id);
      await fetchList();
    } catch (e) {
      lastError.value = e;
      error.value = e.message || '删除失败';
      throw e;
    }
  }

  function getDownloadUrl(id) {
    return filesApi.downloadUrl(id);
  }

  onScopeDispose(() => {
    isDisposed = true;
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }
  });

  return {
    items,
    page,
    limit,
    total,
    totalPages,
    type,
    search,
    uploading,
    loading,
    uploadProgress,
    uploadedBytes,
    totalBytes,
    currentFileName,
    uploadQueue,
    error,
    lastError,
    fetchList,
    upload,
    remove,
    getDownloadUrl,
    setPage: p => (page.value = Number(p) || 1),
    setLimit: l => (limit.value = Number(l) || 20),
    setType: v => (type.value = v ?? ''),
    setSearch: v => (search.value = v ?? ''),
  };
}
