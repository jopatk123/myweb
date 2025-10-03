const uploadWallpaperMock = vi.hoisted(() => vi.fn());
const processImageFileMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/wallpaper.js', () => ({
  wallpaperApi: {
    uploadWallpaper: uploadWallpaperMock,
  },
}));

vi.mock('@/composables/useImageProcessing.js', () => ({
  processImageFile: processImageFileMock,
}));

import { useWallpaperUploader } from '@/composables/useWallpaperUploader.js';

describe('useWallpaperUploader', () => {
  beforeEach(() => {
    uploadWallpaperMock.mockReset();
    processImageFileMock.mockReset();
  });

  it('processes single file and populates state', async () => {
    const processed = {
      file: new File(['processed'], 'nice.jpg', { type: 'image/jpeg' }),
      name: 'nice.jpg',
      preview: 'data://preview',
      size: 1024,
      progress: 0,
    };
    processImageFileMock.mockResolvedValue(processed);

    const uploader = useWallpaperUploader();
    const incoming = [new File(['raw'], 'nice.jpg', { type: 'image/jpeg' })];

    await uploader.handleFiles(incoming);

    expect(processImageFileMock).toHaveBeenCalledTimes(1);
    expect(uploader.files.value).toHaveLength(1);
    expect(uploader.files.value[0].file).toBe(processed.file);
    expect(uploader.wallpaperName.value).toBe('nice');
    expect(uploader.error.value).toBe('');
  });

  it('uploads single file and tracks progress', async () => {
    const uploadProgress = [];
    uploadWallpaperMock.mockImplementation(
      (_file, groupId, name, onProgress) => {
        expect(groupId).toBe('group-1');
        expect(name).toBe('custom name');
        onProgress(25.4);
        onProgress(100);
        uploadProgress.push(100);
        return Promise.resolve();
      }
    );

    const uploader = useWallpaperUploader();
    uploader.selectedGroupId.value = 'group-1';
    uploader.wallpaperName.value = 'custom name';
    uploader.files.value = [
      {
        file: new File(['content'], 'wall.jpg', { type: 'image/jpeg' }),
        name: 'wall.jpg',
        progress: 0,
      },
    ];

    await uploader.upload();

    expect(uploadWallpaperMock).toHaveBeenCalledTimes(1);
    expect(uploader.files.value[0].progress).toBe(100);
    expect(uploadProgress).toHaveLength(1);
    expect(uploader.uploading.value).toBe(false);
    expect(uploader.error.value).toBe('');
  });

  it('handles upload failures gracefully', async () => {
    uploadWallpaperMock.mockRejectedValue(new Error('network error'));

    const uploader = useWallpaperUploader();
    uploader.files.value = [
      {
        file: new File(['content'], 'wall.jpg', { type: 'image/jpeg' }),
        name: 'wall.jpg',
        progress: 0,
      },
    ];

    await expect(uploader.upload()).rejects.toThrow('network error');
    expect(uploader.uploading.value).toBe(false);
    expect(uploader.error.value).toBe('network error');
  });

  it('continues processing multiple files when possible', async () => {
    processImageFileMock
      .mockResolvedValueOnce({
        file: new File(['one'], 'one.jpg', { type: 'image/jpeg' }),
        name: 'one.jpg',
        preview: 'data://one',
      })
      .mockRejectedValueOnce(new Error('bad image'))
      .mockResolvedValueOnce({
        file: new File(['three'], 'three.jpg', { type: 'image/jpeg' }),
        name: 'three.jpg',
        preview: 'data://three',
      });

    const uploader = useWallpaperUploader({ multiple: true });
    const payload = [
      new File(['payload'], 'one.jpg', { type: 'image/jpeg' }),
      new File(['payload'], 'two.jpg', { type: 'image/jpeg' }),
      new File(['payload'], 'three.jpg', { type: 'image/jpeg' }),
    ];

    await uploader.handleFiles(payload);

    expect(processImageFileMock).toHaveBeenCalledTimes(3);
    expect(uploader.files.value).toHaveLength(2);
    expect(uploader.error.value).toBe('部分文件处理失败，已跳过');
  });

  it('reset clears selection and errors', async () => {
    const uploader = useWallpaperUploader();
    uploader.files.value = [
      { name: 'foo', file: new File(['x'], 'foo.jpg', { type: 'image/jpeg' }) },
    ];
    uploader.wallpaperName.value = 'foo';
    uploader.error.value = 'bad';

    uploader.reset();

    expect(uploader.files.value).toHaveLength(0);
    expect(uploader.wallpaperName.value).toBe('');
    expect(uploader.error.value).toBe('');
  });
});
