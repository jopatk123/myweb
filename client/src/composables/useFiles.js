import { ref, computed, onScopeDispose } from 'vue';
import { filesApi } from '@/api/files.js';
import { unwrapData } from '@/api/httpClient.js';
import { createStableId } from '@/utils/stableId.js';

/** 单批次最大并发上传数 */
const DEFAULT_CONCURRENCY = 3;

/** 桌面全量拉取时的单页大小，与列表接口 limit 上限一致 */
const LIST_ALL_PAGE_SIZE = 200;

export const UPLOAD_IN_PROGRESS_MESSAGE = '已有文件正在上传，请稍后再拖入';

function isAbortError(err, signal) {
  return (
    signal?.aborted ||
    err?.name === 'AbortError' ||
    err?.code === 'ERR_CANCELED'
  );
}

function buildUploadFailureMessage(queue) {
  const doneCount = queue.filter(item => item.status === 'done').length;
  const failed = queue.filter(item => item.status === 'error');
  const details = failed
    .slice(0, 3)
    .map(item => `${item.name}（${item.error || '上传失败'}）`)
    .join('，');
  const suffix = failed.length > 3 ? '…' : '';
  return `成功 ${doneCount} 个，失败 ${failed.length} 个：${details}${suffix}`;
}

/**
 * 工作器主循环：从共享索引取下一个文件上传。
 * 单个文件失败只记录该条，其余文件继续；取消时中断当前请求并退出循环。
 */
async function runWorkerLoop(ctx) {
  while (true) {
    if (ctx.isAborted() || ctx.signal?.aborted) break;

    const i = ctx.sharedIndex.value;
    if (i >= ctx.fileArray.length) break;
    ctx.sharedIndex.value = i + 1;

    const file = ctx.fileArray[i];
    ctx.onFileStart(i);
    try {
      await filesApi.upload(
        [file],
        progress => {
          if (ctx.isAborted()) return;
          ctx.onFileProgress(i, progress);
        },
        ctx.signal
      );
      if (ctx.isAborted() || ctx.signal?.aborted) {
        ctx.onFileCancelled(i);
        break;
      }
      ctx.onFileComplete(i);
    } catch (err) {
      if (isAbortError(err, ctx.signal)) {
        ctx.onFileCancelled(i);
        break;
      }
      ctx.onFileError(i, err);
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
   * 按页拉全量文件，供桌面展示，不改动当前分页状态。
   */
  async function fetchAll() {
    if (isDisposed) return;
    loading.value = true;
    try {
      error.value = '';
      lastError.value = null;
      let currentPage = 1;
      let collected = [];
      let reportedTotal = 0;

      while (currentPage <= 10000) {
        const raw = await filesApi.list({
          page: currentPage,
          limit: LIST_ALL_PAGE_SIZE,
          type: type.value || undefined,
          search: (search.value || '').trim() || undefined,
        });
        const data = unwrapData(raw);
        const batch = data.files || [];
        reportedTotal = data.pagination?.total || 0;
        collected = collected.concat(batch);
        if (batch.length === 0 || collected.length >= reportedTotal) break;
        currentPage += 1;
      }

      if (!isDisposed) {
        items.value = collected;
        total.value = reportedTotal;
      }
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
   * 并发上传多个文件。单个失败不中止其余文件。
   * @param {File[]|File} files
   * @param {{ refresh?: 'page' | 'all' }} [options]
   */
  async function upload(files, { refresh = 'page' } = {}) {
    if (isDisposed) return;
    if (uploading.value) {
      const err = new Error(UPLOAD_IN_PROGRESS_MESSAGE);
      err.code = 'UPLOAD_IN_PROGRESS';
      throw err;
    }

    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      cleanupTimer = null;
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
      status: 'pending',
      error: '',
    }));

    // 单批次 AbortController：cancelUpload 或组件卸载时触发
    const controller = new AbortController();
    activeController = controller;

    // 单文件已上传字节缓存，用于汇总 uploadedBytes
    const fileUploadedBytes = new Array(fileArray.length).fill(0);
    const sharedIndex = { value: 0 };

    const refreshList = () => (refresh === 'all' ? fetchAll() : fetchList());

    const updateAggregate = () => {
      const sumBytes = fileUploadedBytes.reduce((a, b) => a + b, 0);
      uploadedBytes.value = sumBytes;
      if (!totalBytes.value) {
        const queue = uploadQueue.value;
        const settled = queue.every(item =>
          ['done', 'error', 'cancelled'].includes(item.status)
        );
        const anyDone = queue.some(item => item.status === 'done');
        const anyError = queue.some(item => item.status === 'error');
        uploadProgress.value = settled && anyDone && !anyError ? 100 : 0;
        return;
      }
      uploadProgress.value = Math.round((sumBytes / totalBytes.value) * 100);
    };

    const onFileStart = i => {
      if (uploadQueue.value[i]) {
        uploadQueue.value[i].status = 'uploading';
      }
      currentFileName.value = fileArray[i].name;
    };

    const onFileProgress = (i, progress) => {
      const file = fileArray[i];
      fileUploadedBytes[i] = Math.round((progress / 100) * file.size);
      if (uploadQueue.value[i]) {
        uploadQueue.value[i].progress = progress;
      }
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
        uploadQueue.value[i].status = 'done';
      }
      updateAggregate();
    };

    const onFileError = (i, err) => {
      if (uploadQueue.value[i]) {
        uploadQueue.value[i].status = 'error';
        uploadQueue.value[i].error = err?.message || '上传失败';
      }
    };

    const onFileCancelled = i => {
      const item = uploadQueue.value[i];
      if (item && item.status !== 'done') {
        item.status = 'cancelled';
      }
    };

    const markUnfinishedCancelled = () => {
      uploadQueue.value.forEach(item => {
        if (item.status === 'pending' || item.status === 'uploading') {
          item.status = 'cancelled';
        }
      });
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
        onFileStart,
        onFileProgress,
        onFileComplete,
        onFileError,
        onFileCancelled,
        signal: controller.signal,
      };

      const workers = [];
      for (let w = 0; w < concurrency; w++) {
        workers.push(runWorkerLoop(workerCtx));
      }
      await Promise.all(workers);

      if (controller.signal.aborted || isDisposed) {
        markUnfinishedCancelled();
        if (!isDisposed) isCancelled.value = true;
        const anyDone = uploadQueue.value.some(item => item.status === 'done');
        if (anyDone && !isDisposed) {
          await refreshList().catch(() => {});
        }
        return;
      }

      if (!isDisposed) {
        await refreshList().catch(() => {});
      }

      const failed = uploadQueue.value.filter(item => item.status === 'error');
      if (failed.length) {
        const failure = new Error(buildUploadFailureMessage(uploadQueue.value));
        failure.code = 'UPLOAD_PARTIAL_FAILURE';
        failure.failures = failed;
        lastError.value = failure;
        error.value = failure.message;
        throw failure;
      }
    } catch (e) {
      if (e?.code === 'UPLOAD_PARTIAL_FAILURE') {
        throw e;
      }
      if (isAbortError(e, controller.signal) || isDisposed) {
        markUnfinishedCancelled();
        if (!isDisposed) isCancelled.value = true;
        return;
      }
      lastError.value = e;
      if (!isDisposed) {
        await refreshList().catch(() => {});
      }
      error.value = e.message || '上传失败';
      throw e;
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
          error.value = '';
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
    fetchAll,
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
