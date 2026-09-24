const apiMocks = vi.hoisted(() => {
  return {
    list: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    downloadUrl: vi.fn(() => '/api/files/1/download'),
  };
});

vi.mock('@/api/files.js', () => ({
  filesApi: apiMocks,
}));

import { effectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useFiles } from '@/composables/useFiles.js';

const mountUseFiles = () => {
  const scope = effectScope();
  const composable = scope.run(() => useFiles());
  return {
    ...composable,
    stop: () => scope.stop(),
  };
};

describe('useFiles composable', () => {
  beforeEach(() => {
    Object.assign(apiMocks, {
      list: vi.fn(),
      upload: vi.fn(),
      delete: vi.fn(),
      downloadUrl: vi.fn(() => '/api/files/1/download'),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetchList trims search keyword and toggles loading state', async () => {
    const mockResponse = {
      code: 200,
      success: true,
      data: {
        files: [{ id: 1, original_name: 'foo.txt' }],
        pagination: { total: 1 },
      },
    };
    apiMocks.list.mockResolvedValue(mockResponse);

    const { fetchList, loading, items, total, search, stop } = mountUseFiles();
    search.value = '  report ';

    expect(loading.value).toBe(false);

    const promise = fetchList();
    expect(loading.value).toBe(true);
    await promise;

    expect(apiMocks.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      type: undefined,
      search: 'report',
    });
    expect(items.value).toEqual(mockResponse.data.files);
    expect(total.value).toBe(1);
    expect(loading.value).toBe(false);

    stop();
  });

  it('propagates API errors during fetchList', async () => {
    const error = new Error('加载失败');
    apiMocks.list.mockRejectedValue(error);

    const { fetchList, error: errorRef, stop } = mountUseFiles();

    await expect(fetchList()).rejects.toThrow('加载失败');
    expect(errorRef.value).toBe('加载失败');

    stop();
  });

  it('uploads files concurrently and refreshes list', async () => {
    vi.useFakeTimers();
    const fileA = new File(['a'], 'a.txt', { type: 'text/plain' });
    const fileB = new File(['b'], 'b.txt', { type: 'text/plain' });

    apiMocks.upload.mockImplementation(async (_files, onProgress) => {
      onProgress(50);
    });
    apiMocks.list.mockResolvedValue({
      code: 200,
      success: true,
      data: { files: [], pagination: { total: 0 } },
    });

    const {
      upload,
      uploadQueue,
      uploadProgress,
      uploadedBytes,
      totalBytes,
      stop,
    } = mountUseFiles();

    await upload([fileA, fileB]);

    expect(apiMocks.upload).toHaveBeenCalledTimes(2);
    expect(apiMocks.list).toHaveBeenCalled();
    expect(uploadQueue.value.length).toBe(2);
    expect(uploadQueue.value.every(item => typeof item.id === 'string')).toBe(
      true
    );
    expect(uploadQueue.value.every(item => item.progress === 100)).toBe(true);
    expect(uploadProgress.value).toBe(100);
    expect(uploadedBytes.value).toBe(fileA.size + fileB.size);
    expect(totalBytes.value).toBe(fileA.size + fileB.size);

    vi.runAllTimers();
    await flushPromises();

    expect(uploadQueue.value.length).toBe(0);
    expect(uploadProgress.value).toBe(0);
    expect(uploadedBytes.value).toBe(0);

    stop();
  });

  it('cancelUpload aborts in-flight uploads and marks isCancelled', async () => {
    vi.useFakeTimers();
    // 使用较大文件让进度百分比聚合后非零（避免 1 字节文件 30% 取整为 0）
    const payload = 'x'.repeat(1000);
    const fileA = new File([payload], 'a.txt', { type: 'text/plain' });
    const fileB = new File([payload], 'b.txt', { type: 'text/plain' });
    const fileC = new File([payload], 'c.txt', { type: 'text/plain' });

    apiMocks.upload.mockImplementation(
      (_files, onProgress, signal) =>
        new Promise((resolve, reject) => {
          // 触发一次进度，让 worker 进入"传输中"状态
          onProgress(30);
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('canceled');
              err.name = 'AbortError';
              err.code = 'ERR_CANCELED';
              reject(err);
            });
          }
          // 不主动 resolve，等待 abort 触发 reject
        })
    );
    apiMocks.list.mockResolvedValue({
      code: 200,
      success: true,
      data: { files: [], pagination: { total: 0 } },
    });

    const {
      upload,
      cancelUpload,
      isCancelled,
      uploading,
      uploadProgress,
      stop,
    } = mountUseFiles();

    // 启动上传（3 个文件，并发 3）
    const uploadPromise = upload([fileA, fileB, fileC]);

    // 让 worker 进入传输中
    await flushPromises();

    expect(uploading.value).toBe(true);
    expect(uploadProgress.value).toBeGreaterThan(0);

    // 用户主动取消
    cancelUpload();

    expect(isCancelled.value).toBe(true);

    await expect(uploadPromise).resolves.toBeUndefined();

    // 取消后 uploading 应复位
    expect(uploading.value).toBe(false);

    // list 不应被调用（取消后不刷新列表）
    expect(apiMocks.list).not.toHaveBeenCalled();

    vi.runAllTimers();
    await flushPromises();

    stop();
  });

  it('cancelUpload is a no-op when no upload is active', () => {
    const { cancelUpload, isCancelled, stop } = mountUseFiles();

    expect(() => cancelUpload()).not.toThrow();
    // 没有进行中的上传时，isCancelled 不应被翻转
    expect(isCancelled.value).toBe(false);

    stop();
  });

  it('continues the batch when one file fails and reports a summary', async () => {
    const files = ['a', 'b', 'c', 'd', 'e'].map(
      name => new File([name], `${name}.txt`, { type: 'text/plain' })
    );

    apiMocks.upload.mockImplementation(async batch => {
      if (batch[0].name === 'b.txt') {
        throw new Error('不支持的文件类型');
      }
    });
    apiMocks.list.mockResolvedValue({
      code: 200,
      success: true,
      data: { files: [], pagination: { total: 0 } },
    });

    const { upload, error: errorRef, uploadQueue, stop } = mountUseFiles();

    await expect(upload(files)).rejects.toThrow(
      '成功 4 个，失败 1 个：b.txt（不支持的文件类型）'
    );

    expect(apiMocks.upload).toHaveBeenCalledTimes(5);
    expect(errorRef.value).toContain('失败 1 个');
    expect(uploadQueue.value.find(item => item.name === 'b.txt').status).toBe(
      'error'
    );
    expect(
      uploadQueue.value.filter(item => item.status === 'done')
    ).toHaveLength(4);
    expect(apiMocks.list).toHaveBeenCalled();

    stop();
  });

  it('rejects a second upload while the first batch is still running', async () => {
    const fileA = new File(['a'], 'a.txt', { type: 'text/plain' });
    const fileB = new File(['b'], 'b.txt', { type: 'text/plain' });
    let releaseUpload;
    apiMocks.upload.mockImplementation(
      () =>
        new Promise(resolve => {
          releaseUpload = resolve;
        })
    );

    const { upload, stop } = mountUseFiles();
    const first = upload([fileA]);
    await flushPromises();

    await expect(upload([fileB])).rejects.toThrow('已有文件正在上传');

    releaseUpload();
    await first;
    stop();
  });

  it('fetchAll loads every page without changing the paging state', async () => {
    apiMocks.list
      .mockResolvedValueOnce({
        code: 200,
        success: true,
        data: {
          files: [{ id: 1 }],
          pagination: { total: 2 },
        },
      })
      .mockResolvedValueOnce({
        code: 200,
        success: true,
        data: {
          files: [{ id: 2 }],
          pagination: { total: 2 },
        },
      });

    const { fetchAll, items, page, limit, stop } = mountUseFiles();
    await fetchAll();

    expect(apiMocks.list).toHaveBeenNthCalledWith(1, {
      page: 1,
      limit: 200,
      type: undefined,
      search: undefined,
    });
    expect(apiMocks.list).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit: 200,
      type: undefined,
      search: undefined,
    });
    expect(items.value.map(file => file.id)).toEqual([1, 2]);
    expect(page.value).toBe(1);
    expect(limit.value).toBe(20);

    stop();
  });

  it('marks a zero-byte upload as complete', async () => {
    const empty = new File([], 'empty.txt', { type: 'text/plain' });
    apiMocks.upload.mockResolvedValue({});
    apiMocks.list.mockResolvedValue({
      code: 200,
      success: true,
      data: { files: [], pagination: { total: 0 } },
    });

    const { upload, uploadProgress, stop } = mountUseFiles();
    await upload([empty]);

    expect(uploadProgress.value).toBe(100);
    stop();
  });

  it('refresh all asks the list endpoint for the full page size', async () => {
    const file = new File(['a'], 'a.txt', { type: 'text/plain' });
    apiMocks.upload.mockResolvedValue({});
    apiMocks.list.mockResolvedValue({
      code: 200,
      success: true,
      data: { files: [{ id: 1 }], pagination: { total: 1 } },
    });

    const { upload, stop } = mountUseFiles();
    await upload([file], { refresh: 'all' });

    expect(apiMocks.list).toHaveBeenCalledWith({
      page: 1,
      limit: 200,
      type: undefined,
      search: undefined,
    });

    stop();
  });

  it('remove refreshes the list on success and reports failures', async () => {
    apiMocks.delete.mockResolvedValue({ code: 200 });
    apiMocks.list.mockResolvedValue({
      code: 200,
      success: true,
      data: { files: [{ id: 2 }], pagination: { total: 1 } },
    });

    const { remove, items, error: errorRef, lastError, stop } = mountUseFiles();

    await remove(1);
    expect(apiMocks.delete).toHaveBeenCalledWith(1);
    expect(items.value.map(file => file.id)).toEqual([2]);

    apiMocks.delete.mockRejectedValue(new Error('删除失败'));
    await expect(remove(1)).rejects.toThrow('删除失败');
    expect(errorRef.value).toBe('删除失败');
    expect(lastError.value.message).toBe('删除失败');

    stop();
  });

  it('stops fetchAll paging when a batch comes back empty', async () => {
    apiMocks.list
      .mockResolvedValueOnce({
        code: 200,
        success: true,
        data: { files: [{ id: 1 }], pagination: { total: 99 } },
      })
      .mockResolvedValueOnce({
        code: 200,
        success: true,
        data: { files: [], pagination: { total: 99 } },
      });

    const { fetchAll, items, total, stop } = mountUseFiles();
    await fetchAll();

    expect(apiMocks.list).toHaveBeenCalledTimes(2);
    expect(items.value.map(file => file.id)).toEqual([1]);
    expect(total.value).toBe(99);

    stop();
  });

  it('normalizes paging setters and delegates download urls', () => {
    const {
      setPage,
      setLimit,
      setType,
      setSearch,
      page,
      limit,
      type,
      search,
      getDownloadUrl,
      stop,
    } = mountUseFiles();

    setPage('abc');
    expect(page.value).toBe(1);
    setPage(3);
    expect(page.value).toBe(3);

    setLimit(0);
    expect(limit.value).toBe(20);
    setLimit(50);
    expect(limit.value).toBe(50);

    setType(null);
    expect(type.value).toBe('');
    setSearch(undefined);
    expect(search.value).toBe('');

    expect(getDownloadUrl(7)).toBe('/api/files/1/download');
    expect(apiMocks.downloadUrl).toHaveBeenCalledWith(7);

    stop();
  });

  it('skips all operations after the scope is disposed', async () => {
    const { fetchList, fetchAll, upload, remove, stop } = mountUseFiles();
    stop();

    await fetchList();
    await fetchAll();
    await upload([new File(['a'], 'a.txt', { type: 'text/plain' })]);
    await remove(1);

    expect(apiMocks.list).not.toHaveBeenCalled();
    expect(apiMocks.upload).not.toHaveBeenCalled();
    expect(apiMocks.delete).not.toHaveBeenCalled();
  });

  it('accepts a bare File and aborts the batch when the scope disposes', async () => {
    const file = new File(['abc'], 'solo.txt', { type: 'text/plain' });
    apiMocks.list.mockResolvedValue({
      code: 200,
      success: true,
      data: { files: [], pagination: { total: 0 } },
    });
    apiMocks.upload.mockImplementation(
      (_files, _onProgress, signal) =>
        new Promise((_resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('canceled');
              err.name = 'AbortError';
              reject(err);
            });
          }
        })
    );

    const { upload, isCancelled, uploadQueue, stop } = mountUseFiles();
    // 裸 File（非数组入参）
    const uploadPromise = upload(file);
    await flushPromises();

    stop(); // 组件卸载 → onScopeDispose 中止当前批次

    await expect(uploadPromise).resolves.toBeUndefined();
    // dispose 触发的取消不翻转 isCancelled（与用户主动取消区分）
    expect(isCancelled.value).toBe(false);
    expect(uploadQueue.value[0].status).toBe('cancelled');
    expect(apiMocks.list).not.toHaveBeenCalled();
  });
});
