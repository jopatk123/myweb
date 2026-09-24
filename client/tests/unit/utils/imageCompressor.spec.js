import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage } from '@/utils/imageCompressor.js';

const originalCreateElement = document.createElement.bind(document);
const OriginalImage = globalThis.Image;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

// imageCompressor 内部通过 new Image() + img.src 触发加载，这里替换成可控桩
let imageConfig = { width: 800, height: 600, fail: false };

class MockImage {
  constructor() {
    this.width = imageConfig.width;
    this.height = imageConfig.height;
    this.onload = null;
    this.onerror = null;
    this._src = '';
  }

  get src() {
    return this._src;
  }

  set src(value) {
    this._src = value;
    Promise.resolve().then(() => {
      if (imageConfig.fail) {
        this.onerror?.(new Error('load error'));
      } else {
        this.onload?.();
      }
    });
  }
}

let canvasMock = null;
let drawImageMock = null;

// blobFor(toBlob 调用序号) => Blob | null，用于模拟逐次质量递减的结果
function installCanvas(blobFor) {
  let callIndex = 0;
  drawImageMock = vi.fn();
  canvasMock = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ drawImage: drawImageMock })),
    toBlob: vi.fn(cb => {
      const index = callIndex;
      callIndex += 1;
      cb(blobFor(index));
    }),
  };
  document.createElement = vi.fn(tag =>
    tag === 'canvas' ? canvasMock : originalCreateElement(tag)
  );
  return canvasMock;
}

function qualitiesUsed() {
  return canvasMock.toBlob.mock.calls.map(call => call[2]);
}

beforeEach(() => {
  imageConfig = { width: 800, height: 600, fail: false };
  globalThis.Image = MockImage;
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  document.createElement = originalCreateElement;
  globalThis.Image = OriginalImage;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});

describe('imageCompressor', () => {
  it('returns the original file when it already fits the size limit', async () => {
    const file = new File(['tiny'], 'tiny.jpg', { type: 'image/jpeg' });

    const result = await compressImage(file);

    expect(result).toBe(file);
  });

  it('compresses through canvas and preserves name/type on first success', async () => {
    installCanvas(() => new Blob(['small'], { type: 'image/jpeg' }));
    const file = new File([new Uint8Array(2048)], 'big.jpg', {
      type: 'image/jpeg',
    });

    const result = await compressImage(file, 1024);

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('big.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(canvasMock.width).toBe(800);
    expect(canvasMock.height).toBe(600);
    expect(canvasMock.toBlob).toHaveBeenCalledTimes(1);
    expect(canvasMock.toBlob.mock.calls[0][1]).toBe('image/jpeg');
    expect(qualitiesUsed()).toEqual([0.9]);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(drawImageMock).toHaveBeenCalledTimes(1);
    expect(drawImageMock.mock.calls[0][0]).toBeInstanceOf(MockImage);
    expect(drawImageMock.mock.calls[0].slice(1)).toEqual([0, 0, 800, 600]);
  });

  it('scales oversized dimensions down to the max resolution', async () => {
    imageConfig = { width: 3840, height: 2160, fail: false };
    installCanvas(() => new Blob(['ok'], { type: 'image/jpeg' }));
    const file = new File([new Uint8Array(4096)], 'huge.jpg', {
      type: 'image/jpeg',
    });

    await compressImage(file, 1024);

    expect(canvasMock.width).toBe(1920);
    expect(canvasMock.height).toBe(1080);
  });

  it('scales by the tighter ratio when only one side exceeds the limit', async () => {
    imageConfig = { width: 1000, height: 2000, fail: false };
    installCanvas(() => new Blob(['ok'], { type: 'image/jpeg' }));
    const file = new File([new Uint8Array(4096)], 'tall.jpg', {
      type: 'image/jpeg',
    });

    await compressImage(file, 1024);

    // ratio = min(1920/1000, 1080/2000) = 0.54
    expect(canvasMock.width).toBe(540);
    expect(canvasMock.height).toBe(1080);
  });

  it('keeps dimensions untouched when within the max resolution', async () => {
    imageConfig = { width: 1600, height: 900, fail: false };
    installCanvas(() => new Blob(['ok'], { type: 'image/jpeg' }));
    const file = new File([new Uint8Array(4096)], 'fine.jpg', {
      type: 'image/jpeg',
    });

    await compressImage(file, 1024);

    expect(canvasMock.width).toBe(1600);
    expect(canvasMock.height).toBe(900);
  });

  it('lowers quality step by step while the blob is still too large', async () => {
    installCanvas(index =>
      index === 0
        ? new Blob([new Uint8Array(4096)], { type: 'image/jpeg' })
        : new Blob(['small'], { type: 'image/jpeg' })
    );
    const file = new File([new Uint8Array(2048)], 'big.jpg', {
      type: 'image/jpeg',
    });

    const result = await compressImage(file, 1024);

    expect(qualitiesUsed()).toEqual([0.9, 0.8]);
    expect(canvasMock.width).toBe(800);
    expect(result.size).toBeGreaterThan(0);
    expect(result.name).toBe('big.jpg');
  });

  it('shrinks dimensions after the quality floor has been reached', async () => {
    imageConfig = { width: 1920, height: 1080, fail: false };
    // 第 0..8 次都过大（质量 0.9 → 0.1），触发一次缩边；第 11 次起成功
    installCanvas(index =>
      index < 11
        ? new Blob([new Uint8Array(4096)], { type: 'image/jpeg' })
        : new Blob(['small'], { type: 'image/jpeg' })
    );
    const file = new File([new Uint8Array(2048)], 'big.jpg', {
      type: 'image/jpeg',
    });

    await compressImage(file, 1024);

    expect(canvasMock.toBlob).toHaveBeenCalledTimes(12);
    expect(canvasMock.width).toBe(1536); // floor(1920 * 0.8)
    expect(canvasMock.height).toBe(864); // floor(1080 * 0.8)
    expect(drawImageMock).toHaveBeenCalledTimes(2);
  });

  it('rejects when canvas.toBlob produces a null blob', async () => {
    installCanvas(() => null);
    const file = new File([new Uint8Array(2048)], 'big.jpg', {
      type: 'image/jpeg',
    });

    await expect(compressImage(file, 1024)).rejects.toThrow('图片压缩失败');
  });

  it('rejects when the image fails to load', async () => {
    imageConfig = { width: 800, height: 600, fail: true };
    installCanvas(() => new Blob(['small'], { type: 'image/jpeg' }));
    const file = new File([new Uint8Array(2048)], 'broken.jpg', {
      type: 'image/jpeg',
    });

    await expect(compressImage(file, 1024)).rejects.toThrow('图片加载失败');
  });

  it('still resolves when revoking the object URL throws', async () => {
    installCanvas(() => new Blob(['small'], { type: 'image/jpeg' }));
    URL.revokeObjectURL = vi.fn(() => {
      throw new Error('revoke denied');
    });
    const file = new File([new Uint8Array(2048)], 'big.jpg', {
      type: 'image/jpeg',
    });

    const result = await compressImage(file, 1024);

    expect(result.name).toBe('big.jpg');
  });
});
