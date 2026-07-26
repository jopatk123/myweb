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
});
