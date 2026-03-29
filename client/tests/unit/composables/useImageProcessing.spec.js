import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compressImage,
  formatFileSize,
  blobToFile,
  processImageFile,
} from '@/composables/useImageProcessing.js';

const originalCreateElement = document.createElement.bind(document);
const OriginalImage = globalThis.Image;
const OriginalFileReader = globalThis.FileReader;

function mockImageAndFileReader({
  width = 1920,
  height = 1080,
  dataUrl = 'data:image/jpeg;base64,abc',
  imageError = false,
}) {
  class MockImage {
    constructor() {
      this.width = width;
      this.height = height;
      this.onload = null;
      this.onerror = null;
    }

    set src(_value) {
      Promise.resolve().then(() => {
        if (imageError) {
          this.onerror?.(new Error('load failed'));
        } else {
          this.onload?.();
        }
      });
    }
  }

  class MockFileReader {
    constructor() {
      this.onload = null;
    }

    readAsDataURL(_file) {
      Promise.resolve().then(() => {
        this.onload?.({ target: { result: dataUrl } });
      });
    }
  }

  globalThis.Image = MockImage;
  globalThis.FileReader = MockFileReader;
}

function mockCanvas({
  blob = new Blob(['compressed'], { type: 'image/jpeg' }),
} = {}) {
  document.createElement = vi.fn(tag => {
    if (tag !== 'canvas') {
      return originalCreateElement(tag);
    }

    return {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn(cb => cb(blob)),
    };
  });
}

afterEach(() => {
  document.createElement = originalCreateElement;
  globalThis.Image = OriginalImage;
  globalThis.FileReader = OriginalFileReader;
  vi.restoreAllMocks();
});

describe('useImageProcessing', () => {
  describe('formatFileSize', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('formats bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('formats megabytes with decimals', () => {
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('formats intermediate values', () => {
      expect(formatFileSize(2560)).toBe('2.5 KB');
    });
  });

  describe('blobToFile', () => {
    it('converts Blob to File with correct name and type', () => {
      const blob = new Blob(['test content'], { type: 'image/jpeg' });
      const file = blobToFile(blob, 'test.jpg');

      expect(file instanceof File).toBe(true);
      expect(file.name).toBe('test.jpg');
      expect(file.type).toBe('image/jpeg');
      expect(file.size).toBe(blob.size);
    });

    it('sets lastModified to current time', () => {
      const before = Date.now();
      const blob = new Blob(['x'], { type: 'image/png' });
      const file = blobToFile(blob, 'img.png');
      const after = Date.now();

      expect(file.lastModified).toBeGreaterThanOrEqual(before);
      expect(file.lastModified).toBeLessThanOrEqual(after);
    });
  });

  describe('compressImage', () => {
    it('resizes large image with ratio and returns blob meta', async () => {
      mockCanvas();
      const img = { width: 4000, height: 2000 };

      const result = await compressImage(img, 1000, 1000, 0.7);

      expect(result.width).toBe(1000);
      expect(result.height).toBe(500);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('keeps original size when image already within max bounds', async () => {
      mockCanvas();
      const img = { width: 640, height: 480 };

      const result = await compressImage(img, 1920, 1080);
      expect(result.width).toBe(640);
      expect(result.height).toBe(480);
    });
  });

  describe('processImageFile', () => {
    it('throws when file is not an image', async () => {
      const file = new File(['x'], 'note.txt', { type: 'text/plain' });
      await expect(processImageFile(file)).rejects.toThrow('只支持图片文件');
    });

    it('throws when image resolution is below minimum', async () => {
      mockImageAndFileReader({ width: 400, height: 300 });

      const file = new File(['x'], 'small.jpg', { type: 'image/jpeg' });
      await expect(
        processImageFile(file, { minWidth: 800, minHeight: 600 })
      ).rejects.toThrow('图片分辨率过低，最小支持 800x600');
    });

    it('returns original file metadata when no compression is needed', async () => {
      mockImageAndFileReader({
        width: 1200,
        height: 800,
        dataUrl: 'data:image/jpeg;base64,preview',
      });

      const file = new File(['hello world'], 'ok.jpg', { type: 'image/jpeg' });
      const result = await processImageFile(file, {
        minWidth: 800,
        minHeight: 600,
        maxWidth: 2000,
        maxHeight: 2000,
        maxSizeMB: 5,
      });

      expect(result.file).toBe(file);
      expect(result.wasCompressed).toBe(false);
      expect(result.width).toBe(1200);
      expect(result.height).toBe(800);
      expect(result.originalWidth).toBe(1200);
      expect(result.originalHeight).toBe(800);
      expect(result.preview).toBe('data:image/jpeg;base64,preview');
      expect(result.name).toBe('ok.jpg');
    });

    it('compresses oversized dimensions and keeps result under max size', async () => {
      mockImageAndFileReader({ width: 4000, height: 3000 });
      mockCanvas({
        blob: new Blob([new Uint8Array(1024)], { type: 'image/jpeg' }),
      });

      const file = new File([new Uint8Array(1024 * 200)], 'big.jpg', {
        type: 'image/jpeg',
      });

      const result = await processImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        maxSizeMB: 1,
      });

      expect(result.wasCompressed).toBe(true);
      expect(result.width).toBeLessThanOrEqual(1000);
      expect(result.height).toBeLessThanOrEqual(1000);
      expect(result.file.name).toBe('big.jpg');
      expect(result.file.size).toBeLessThan(file.size);
    });

    it('throws when size exceeds max and file was not compressed by dimensions', async () => {
      mockImageAndFileReader({ width: 1200, height: 900 });
      const file = new File([new Uint8Array(3 * 1024 * 1024)], 'too-big.jpg', {
        type: 'image/jpeg',
      });

      await expect(
        processImageFile(file, {
          minWidth: 800,
          minHeight: 600,
          maxWidth: 2000,
          maxHeight: 2000,
          maxSizeMB: 1,
        })
      ).rejects.toThrow('文件大小超过1MB，请选择更小的图片');
    });

    it('recompresses and throws when still too large after second attempt', async () => {
      mockImageAndFileReader({ width: 4000, height: 3000 });

      const tooLargeBlob = new Blob([new Uint8Array(2 * 1024 * 1024)], {
        type: 'image/jpeg',
      });
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation(tag => {
          if (tag !== 'canvas') {
            return originalCreateElement(tag);
          }
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({ drawImage: vi.fn() })),
            toBlob: vi.fn(cb => cb(tooLargeBlob)),
          };
        });

      const file = new File([new Uint8Array(1024)], 'still-big.jpg', {
        type: 'image/jpeg',
      });

      await expect(
        processImageFile(file, {
          maxWidth: 800,
          maxHeight: 800,
          maxSizeMB: 1,
        })
      ).rejects.toThrow('图片压缩后仍超过1MB，请选择更小的图片');

      expect(createElementSpy).toHaveBeenCalled();
    });

    it('propagates image loading error', async () => {
      mockImageAndFileReader({ imageError: true });
      const file = new File(['abc'], 'broken.jpg', { type: 'image/jpeg' });

      await expect(processImageFile(file)).rejects.toBeDefined();
    });
  });
});
