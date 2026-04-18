/**
 * 魔数验证工具单元测试
 *
 * 使用内存中构造的 Buffer 模拟文件头，验证
 * validateImageMagicBytes 与 assertValidImageFile 的行为
 */
import { jest } from '@jest/globals';

// Mock fs/promises，让测试不依赖真实文件系统
jest.unstable_mockModule('fs/promises', () => ({
  default: {
    open: jest.fn(),
  },
  open: jest.fn(),
}));

const fsMock = await import('fs/promises');

const { validateImageMagicBytes, assertValidImageFile } = await import(
  '../../src/utils/magic-bytes.js'
);

/**
 * 构建一个模拟文件读取的 mock：
 * fd.read 将 buffer 内容复制到目标 Buffer 中
 */
function makeFdMock(headerBytes) {
  return {
    read: jest.fn(async (buffer, offset, length, position) => {
      const src = Buffer.from(headerBytes);
      src.copy(buffer, offset, position, position + length);
      return { bytesRead: Math.min(length, src.length) };
    }),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('validateImageMagicBytes', () => {
  describe('JPEG', () => {
    it('识别有效 JPEG 文件（FF D8 FF）', async () => {
      const header = [
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/photo.jpg',
        'image/jpeg'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/jpeg');
    });
  });

  describe('PNG', () => {
    it('识别有效 PNG 文件（89 50 4E 47 ...）', async () => {
      const header = [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/image.png',
        'image/png'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/png');
    });
  });

  describe('GIF', () => {
    it('识别 GIF89a', async () => {
      const header = [
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x2c, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/anim.gif',
        'image/gif'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/gif');
    });

    it('识别 GIF87a', async () => {
      const header = [
        0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x2c, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/anim87.gif',
        'image/gif'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/gif');
    });
  });

  describe('WebP', () => {
    it('识别有效 WebP 文件（RIFF....WEBP）', async () => {
      // RIFF (4) + size (4) + WEBP (4) + padding (4)
      const header = [
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x24,
        0x00,
        0x00,
        0x00, // size
        0x57,
        0x45,
        0x42,
        0x50, // WEBP
        0x56,
        0x50,
        0x38,
        0x4c, // VP8L
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/image.webp',
        'image/webp'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/webp');
    });

    it('RIFF 头不带 WEBP 标识时应返回 invalid', async () => {
      const header = [
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x24,
        0x00,
        0x00,
        0x00, // size
        0x41,
        0x56,
        0x49,
        0x20, // AVI (不是 WEBP)
        0x4c,
        0x49,
        0x53,
        0x54,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/video.avi',
        'image/webp'
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('BMP', () => {
    it('识别有效 BMP 文件（BM）', async () => {
      const header = [
        0x42, 0x4d, 0x36, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00,
        0x00, 0x00, 0x28, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/image.bmp',
        'image/bmp'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/bmp');
    });
  });

  describe('恶意文件检测', () => {
    it('PHP 文件伪装成图片时应返回 invalid', async () => {
      // <?php 开头
      const header = [
        0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6f, 0x20, 0x27,
        0x58, 0x53, 0x53, 0x27,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/evil.jpg',
        'image/jpeg'
      );

      expect(result.valid).toBe(false);
      expect(result.detectedMime).toBeNull();
    });

    it('可执行文件（ELF）伪装成图片时应返回 invalid', async () => {
      // ELF magic: 7F 45 4C 46
      const header = [
        0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/malware.png',
        'image/png'
      );

      expect(result.valid).toBe(false);
    });

    it('ZIP 文件伪装成图片时应返回 invalid', async () => {
      // PK header: 50 4B 03 04
      const header = [
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateImageMagicBytes(
        '/fake/archive.jpg',
        'image/jpeg'
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('文件读取失败', () => {
    it('文件不存在时（ENOENT）返回 { valid: true }（跳过验证）', async () => {
      fsMock.default.open.mockRejectedValue(
        Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
      );

      const result = await validateImageMagicBytes(
        '/nonexistent/file.jpg',
        'image/jpeg'
      );

      // 文件不存在无法验证魔数，视为通过（MIME 欺骗需要文件存在才能发生）
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBeNull();
    });

    it('其他读取错误时返回 { valid: false, detectedMime: null }', async () => {
      fsMock.default.open.mockRejectedValue(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      );

      const result = await validateImageMagicBytes(
        '/unreadable/file.jpg',
        'image/jpeg'
      );

      expect(result.valid).toBe(false);
      expect(result.detectedMime).toBeNull();
    });
  });
});

describe('assertValidImageFile', () => {
  it('对有效图片文件不抛出错误', async () => {
    const jpegHeader = [
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x01,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(jpegHeader));

    await expect(
      assertValidImageFile('/valid.jpg', 'image/jpeg')
    ).resolves.toBe('image/jpeg');
  });

  it('对恶意文件抛出含 status=422 的错误', async () => {
    // 非图片文件头
    const evilHeader = [
      0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6f, 0x20, 0x27,
      0x58, 0x53, 0x53, 0x27,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(evilHeader));

    await expect(
      assertValidImageFile('/evil.jpg', 'image/jpeg')
    ).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_FILE_CONTENT',
    });
  });

  it('对无法读取的文件（非ENOENT）抛出错误', async () => {
    fsMock.default.open.mockRejectedValue(
      Object.assign(new Error('Permission denied'), { code: 'EACCES' })
    );

    await expect(
      assertValidImageFile('/unreadable.jpg', 'image/jpeg')
    ).rejects.toThrow();
  });
});
