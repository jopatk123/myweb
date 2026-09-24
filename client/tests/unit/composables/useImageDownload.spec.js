import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useImageDownload } from '@/composables/useImageDownload.js';
import { useGlobalToast } from '@/composables/useGlobalToast.js';

const createFetchResponse = (ok, blob) => ({
  ok,
  blob: async () => blob,
});

describe('useImageDownload', () => {
  let fetchMock;
  let createObjectURL;
  let revokeObjectURL;
  let toastState;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    // jsdom 未实现 URL.createObjectURL/revokeObjectURL，直接挂到全局 URL 上
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    toastState = useGlobalToast().toastState;
  });

  it('成功下载：拉取 blob、生成临时链接、点击下载并清理', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const blob = new Blob(['image-bytes']);
    fetchMock.mockResolvedValue(createFetchResponse(true, blob));

    const { saveImage } = useImageDownload();
    await saveImage({ originalName: 'photo.png' }, img => img.originalName);

    expect(fetchMock).toHaveBeenCalledWith('photo.png');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    // 下载用锚点已从 DOM 移除
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    expect(toastState.message).toBe('图片已保存');
    expect(toastState.type).toBe('success');
    clickSpy.mockRestore();
  });

  it('文件名规则：带扩展名用原扩展名，否则回退 jpg', async () => {
    const downloads = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        downloads.push(this.download);
      });
    fetchMock.mockResolvedValue(createFetchResponse(true, new Blob(['x'])));

    const { saveImage } = useImageDownload();
    await saveImage({ originalName: 'no-extension' }, img => img.originalName);
    await saveImage({ originalName: 'pic.png' }, img => img.originalName);
    await saveImage({}, img => img.originalName); // 无 originalName → 默认 image

    expect(downloads[0]).toMatch(
      /^message-image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.jpg$/
    );
    expect(downloads[1]).toMatch(
      /^message-image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/
    );
    expect(downloads[2]).toMatch(
      /^message-image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.jpg$/
    );
    clickSpy.mockRestore();
  });

  it('响应非 2xx 时展示错误 toast 且不创建下载', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(createFetchResponse(false, null));

    const { saveImage } = useImageDownload();
    await expect(
      saveImage({ originalName: 'a.png' }, () => '/api/img')
    ).resolves.toBeUndefined();

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(toastState.message).toBe('保存图片失败: 图片下载失败');
    expect(toastState.type).toBe('error');
    clickSpy.mockRestore();
  });

  it('网络请求失败时展示错误 toast', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error('network down'));

    const { saveImage } = useImageDownload();
    await saveImage({ originalName: 'a.png' }, () => '/api/img');

    expect(toastState.message).toBe('保存图片失败: network down');
    expect(toastState.type).toBe('error');
  });

  it('blob 解析失败同样走错误路径', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => {
        throw new Error('bad blob');
      },
    });

    const { saveImage } = useImageDownload();
    await saveImage({ originalName: 'a.png' }, () => '/api/img');

    expect(toastState.message).toBe('保存图片失败: bad blob');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('getImageUrl 回调以图片对象调用，其返回值作为请求地址', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fetchMock.mockResolvedValue(createFetchResponse(true, new Blob(['x'])));
    const getImageUrl = vi.fn(() => '/api/img/1');

    const { saveImage } = useImageDownload();
    const image = { originalName: 'a.png' };
    await saveImage(image, getImageUrl);

    expect(getImageUrl).toHaveBeenCalledWith(image);
    expect(fetchMock).toHaveBeenCalledWith('/api/img/1');
  });

  it('showSaveSuccess 直接触发成功提示', () => {
    const { showSaveSuccess } = useImageDownload();
    showSaveSuccess();
    expect(toastState.message).toBe('图片已保存');
    expect(toastState.type).toBe('success');
    expect(toastState.visible).toBe(true);
  });
});
