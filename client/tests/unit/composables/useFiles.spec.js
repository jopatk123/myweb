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

import { flushPromises } from '@vue/test-utils';
import { useFiles } from '@/composables/useFiles.js';

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

    const { fetchList, loading, items, total, search } = useFiles();
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
  });

  it('propagates API errors during fetchList', async () => {
    const error = new Error('加载失败');
    apiMocks.list.mockRejectedValue(error);

    const { fetchList, error: errorRef } = useFiles();

    await expect(fetchList()).rejects.toThrow('加载失败');
    expect(errorRef.value).toBe('加载失败');
  });

  it('uploads files sequentially and refreshes list', async () => {
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

    const { upload, uploadQueue, uploadProgress, uploadedBytes, totalBytes } =
      useFiles();

    await upload([fileA, fileB]);

    expect(apiMocks.upload).toHaveBeenCalledTimes(2);
    expect(apiMocks.list).toHaveBeenCalled();
    expect(uploadQueue.value.length).toBe(2);
    expect(uploadQueue.value.every(item => item.progress === 100)).toBe(true);
    expect(uploadProgress.value).toBe(100);
    expect(uploadedBytes.value).toBe(fileA.size + fileB.size);
    expect(totalBytes.value).toBe(fileA.size + fileB.size);

    vi.runAllTimers();
    await flushPromises();

    expect(uploadQueue.value.length).toBe(0);
    expect(uploadProgress.value).toBe(0);
    expect(uploadedBytes.value).toBe(0);
  });
});
