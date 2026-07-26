import { ref, computed, onScopeDispose } from 'vue';
import { filesApi } from '@/api/files.js';
import { unwrapData } from '@/api/httpClient.js';
import { createStableId } from '@/utils/stableId.js';

/** 单批次最大并发上传数 */
const DEFAULT_CONCURRENCY = 3;

/**
 * 工作器主循环：从共享索引取下一个文件上传
 *
 * 多个 worker 共享同一个 `sharedIndex` 对象，确保每个文件只被一个 worker 取走。
 * 取消时通过 AbortSignal 通知 axios 中断请求，worker 退出循环。
 */
async function runWorkerLoop(ctx) {
  while (true) {
    if (ctx.isAborted() || ctx.signal?.aborted) break;

    const i = ctx.sharedIndex.value;
    if (i >= ctx.fileArray.length) break;
    ctx.sharedIndex.value = i + 1;

    const file = ctx.fileArray[i];
    try {
      await filesApi.upload(
        [file],
        progress => {
          if (ctx.isAborted()) return;
          ctx.onFileProgress(i, progress);
        },
        ctx.signal
      );
      ctx.onFileComplete(i);
    } catch (err) {
      if (
        ctx.signal?.aborted ||
        err?.name === 'AbortError' ||
        err?.code === 'ERR_CANCELED'
      ) {
        // 用户主动取消，正常退出循环
        break;
      }
      throw err;
    }
  }
}

export function useFiles({
  concurrency: concurrencyOption = DEFAULT_CONCURRENCY,
} = {}) {
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
  const isCancelled = ref(false);
  let cleanupTimer = null;
  let isDisposed = false;
  let activeController = null;

  const totalPages = computed(() =>
    Math.ceil((total.value || 0) / (limit.value || 1))
  );

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
      const data = unwrapData(raw);
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

  /**
   * 并发上传多个文件
   * @param {File[]|File} files
   */
  async function upload(files) {
    if (isDisposed) return;
    if (uploading.value) {
      // 已有上传进行中，避免重复触发
      return;
    }

    uploading.value = true;
    isCancelled.value = false;
    uploadProgress.value = 0;
    uploadedBytes.value = 0;
    totalBytes.value = 0;
    currentFileName.value = '';
    uploadQueue.value = [];
    error.value = '';

    const fileArray = Array.isArray(files) ? files : [files];
    totalBytes.value = fileArray.reduce((sum, file) => sum + file.size, 0);
    uploadQueue.value = fileArray.map(file => ({
      id: createStableId(),
      name: file.name,
      size: file.size,
      progress: 0,
    }));

    // 单批次 AbortController：cancelUpload 或组件卸载时触发
    const controller = new AbortController();
    activeController = controller;

    // 单文件已上传字节缓存，用于汇总 uploadedBytes
    const fileUploadedBytes = new Array(fileArray.length).fill(0);
    const sharedIndex = { value: 0 };

    const updateAggregate = () => {
      const sumBytes = fileUploadedBytes.reduce((a, b) => a + b, 0);
      uploadedBytes.value = sumBytes;
      uploadProgress.value = totalBytes.value
        ? Math.round((sumBytes / totalBytes.value) * 100)
        : 0;
    };

    const onFileProgress = (i, progress) => {
      const file = fileArray[i];
      fileUploadedBytes[i] = Math.round((progress / 100) * file.size);
      if (uploadQueue.value[i]) {
        uploadQueue.value[i].progress = progress;
      }
      // 更新当前正在上传的文件名（取进度非 0/100 的最新一个）
      if (progress > 0 && progress < 100) {
        currentFileName.value = file.name;
      }
      updateAggregate();
    };

    const onFileComplete = i => {
      const file = fileArray[i];
      fileUploadedBytes[i] = file.size;
      if (uploadQueue.value[i]) {
        uploadQueue.value[i].progress = 100;
      }
      updateAggregate();
    };

    try {
      lastError.value = null;
      const concurrency = Math.min(
        Math.max(1, concurrencyOption),
        fileArray.length
      );

      const workerCtx = {
        fileArray,
        sharedIndex,
        isAborted: () => isDisposed || controller.signal.aborted,
        onFileProgress,
        onFileComplete,
        signal: controller.signal,
      };

      const workers = [];
      for (let w = 0; w < concurrency; w++) {
        workers.push(runWorkerLoop(workerCtx));
      }
      await Promise.all(workers);

      if (!isDisposed && !controller.signal.aborted) {
        await fetchList();
      }
    } catch (e) {
      if (
        controller.signal.aborted ||
        e?.name === 'AbortError' ||
        e?.code === 'ERR_CANCELED'
      ) {
        // 用户主动取消，不视为错误
        isCancelled.value = true;
      } else {
        lastError.value = e;
        error.value = e.message || '上传失败';
        throw e;
      }
    } finally {
      if (!isDisposed) {
        uploading.value = false;
        activeController = null;
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

  /**
   * 取消当前正在进行的上传批次
   */
  function cancelUpload() {
    if (activeController) {
      activeController.abort();
      activeController = null;
      isCancelled.value = true;
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
    // 取消正在进行的上传
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
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
    isCancelled,
    fetchList,
    upload,
    cancelUpload,
    remove,
    getDownloadUrl,
    setPage: p => (page.value = Number(p) || 1),
    setLimit: l => (limit.value = Number(l) || 20),
    setType: v => (type.value = v ?? ''),
    setSearch: v => (search.value = v ?? ''),
  };
}
