/**
 * 魔数验证工具单元测试
 *
 * 使用内存中构造的 Buffer 模拟文件头，验证
 * validateImageMagicBytes / assertValidImageFile /
 * validateArchiveMagicBytes / assertValidUploadedFile 的行为
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

const {
  validateImageMagicBytes,
  assertValidImageFile,
  validateArchiveMagicBytes,
  assertValidUploadedFile,
} = await import('../../src/utils/magic-bytes.js');

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
    it('文件不存在时（ENOENT）返回 { valid: false }（fail-closed）', async () => {
      fsMock.default.open.mockRejectedValue(
        Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
      );

      const result = await validateImageMagicBytes(
        '/nonexistent/file.jpg',
        'image/jpeg'
      );

      // fail-closed：文件不存在无法验证魔数，一律判为无效，避免绕过校验
      expect(result.valid).toBe(false);
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

describe('validateArchiveMagicBytes', () => {
  describe('PDF', () => {
    it('识别有效 PDF 文件（%PDF-）', async () => {
      // %PDF-1.5
      const header = [
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a, 0x25, 0xe2, 0xe3,
        0xcf, 0xd3, 0x0a, 0x33,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/doc.pdf',
        'application/pdf'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/pdf');
    });
  });

  describe('ZIP', () => {
    it('识别有效 ZIP 文件（PK\\x03\\x04）', async () => {
      const header = [
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.zip',
        'application/zip'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/zip');
    });

    it('识别空归档 ZIP（PK\\x05\\x06）', async () => {
      const header = [
        0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/empty.zip',
        'application/zip'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/zip');
    });
  });

  describe('7z', () => {
    it('识别有效 7z 文件', async () => {
      // 7z \xBC \xAF \x27 \x1C
      const header = [
        0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x03, 0x7b, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.7z',
        'application/x-7z-compressed'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/x-7z-compressed');
    });
  });

  describe('RAR', () => {
    it('识别 RAR v4 文件', async () => {
      // Rar!\x1A\x07\x00
      const header = [
        0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.rar',
        'application/x-rar-compressed'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/x-rar-compressed');
    });

    it('识别 RAR v5 文件', async () => {
      // Rar!\x1A\x07\x01\x00
      const header = [
        0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive5.rar',
        'application/vnd.rar'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/vnd.rar');
    });
  });

  describe('gzip / bzip2 / xz', () => {
    it('识别 gzip 文件（\\x1F \\x8B）', async () => {
      const header = [
        0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.gz',
        'application/gzip'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/gzip');
    });

    it('识别 bzip2 文件（BZh）', async () => {
      const header = [
        0x42, 0x5a, 0x68, 0x39, 0x31, 0x41, 0x59, 0x26, 0x53, 0x72, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.bz2',
        'application/x-bzip2'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/x-bzip2');
    });

    it('识别 xz 文件（\\xFD 7z XZ \\x00）', async () => {
      const header = [
        0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.xz',
        'application/x-xz'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/x-xz');
    });
  });

  describe('tar', () => {
    it('识别有效 tar 文件（ustar @ offset 257）', async () => {
      // 构造一个 262 字节的 buffer，在 offset 257 处填入 "ustar"
      const header = new Array(262).fill(0x00);
      // ustar
      header[257] = 0x75;
      header[258] = 0x73;
      header[259] = 0x74;
      header[260] = 0x61;
      header[261] = 0x72;
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.tar',
        'application/x-tar'
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/x-tar');
    });

    it('非 tar 声明时不校验 ustar 标识', async () => {
      // 即使含 ustar 标识，声明为 zip 时不应通过 tar 校验
      const header = new Array(262).fill(0x00);
      header[257] = 0x75; // u
      header[258] = 0x73; // s
      header[259] = 0x74; // t
      header[260] = 0x61; // a
      header[261] = 0x72; // r
      // 但开头没有 ZIP 魔数
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/archive.zip',
        'application/zip'
      );

      expect(result.valid).toBe(false);
      expect(result.detectedMime).toBeNull();
    });
  });

  describe('恶意文件检测', () => {
    it('PHP 文件伪装成 ZIP 时应返回 invalid', async () => {
      const header = [
        0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6f, 0x20, 0x27,
        0x58, 0x53, 0x53, 0x27,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/evil.zip',
        'application/zip'
      );

      expect(result.valid).toBe(false);
      expect(result.detectedMime).toBeNull();
    });

    it('图片文件伪装成 PDF 时应返回 invalid', async () => {
      // JPEG header
      const header = [
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
      ];
      fsMock.default.open.mockResolvedValue(makeFdMock(header));

      const result = await validateArchiveMagicBytes(
        '/fake/evil.pdf',
        'application/pdf'
      );

      expect(result.valid).toBe(false);
      expect(result.detectedMime).toBeNull();
    });
  });

  describe('文件读取失败', () => {
    it('文件不存在（ENOENT）返回 invalid（fail-closed）', async () => {
      fsMock.default.open.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      const result = await validateArchiveMagicBytes(
        '/nonexistent/file.zip',
        'application/zip'
      );

      expect(result.valid).toBe(false);
      expect(result.detectedMime).toBeNull();
    });
  });
});

describe('assertValidUploadedFile', () => {
  it('图片走 assertValidImageFile：有效图片返回 detectedMime', async () => {
    const pngHeader = [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(pngHeader));

    await expect(
      assertValidUploadedFile('/fake/image.png', 'image/png', 'image.png')
    ).resolves.toBe('image/png');
  });

  it('图片走 assertValidImageFile：恶意文件抛出 status=422', async () => {
    const evilHeader = [
      0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6f, 0x20, 0x27,
      0x58, 0x53, 0x53, 0x27,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(evilHeader));

    await expect(
      assertValidUploadedFile('/fake/evil.jpg', 'image/jpeg', 'evil.jpg')
    ).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_FILE_CONTENT',
    });
  });

  it('PDF 走 archive 校验：有效 PDF 返回 detectedMime', async () => {
    const pdfHeader = [
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a, 0x25, 0xe2, 0xe3,
      0xcf, 0xd3, 0x0a, 0x33,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(pdfHeader));

    await expect(
      assertValidUploadedFile('/fake/doc.pdf', 'application/pdf', 'doc.pdf')
    ).resolves.toBe('application/pdf');
  });

  it('压缩包走 archive 校验：有效 ZIP 返回 detectedMime', async () => {
    const zipHeader = [
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(zipHeader));

    await expect(
      assertValidUploadedFile('/fake/a.zip', 'application/zip', 'a.zip')
    ).resolves.toBe('application/zip');
  });

  it('压缩包伪装：恶意文件抛出 status=422', async () => {
    const evilHeader = [
      0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6f, 0x20, 0x27,
      0x58, 0x53, 0x53, 0x27,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(evilHeader));

    await expect(
      assertValidUploadedFile('/fake/evil.zip', 'application/zip', 'evil.zip')
    ).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_FILE_CONTENT',
    });
  });

  it('Office 文档（非图片/压缩包/PDF）跳过校验返回 null', async () => {
    // Word 文档本质是 ZIP 容器，但 detectTypeCategory 归类为 WORD，
    // 走 "其他类型暂不校验" 分支
    const docxHeader = [
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(docxHeader));

    await expect(
      assertValidUploadedFile(
        '/fake/doc.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc.docx'
      )
    ).resolves.toBeNull();
  });

  it('视频/音频/文本/代码类型跳过校验返回 null', async () => {
    fsMock.default.open.mockResolvedValue(
      makeFdMock([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    );

    await expect(
      assertValidUploadedFile('/fake/v.mp4', 'video/mp4', 'v.mp4')
    ).resolves.toBeNull();

    await expect(
      assertValidUploadedFile('/fake/a.mp3', 'audio/mpeg', 'a.mp3')
    ).resolves.toBeNull();

    await expect(
      assertValidUploadedFile('/fake/t.txt', 'text/plain', 't.txt')
    ).resolves.toBeNull();
  });

  it('MIME 缺失时按扩展名推断类型并选择校验策略', async () => {
    // MIME 缺失，扩展名 .pdf → 归类为 PDF → 走 archive 校验
    const pdfHeader = [
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a, 0x25, 0xe2, 0xe3,
      0xcf, 0xd3, 0x0a, 0x33,
    ];
    fsMock.default.open.mockResolvedValue(makeFdMock(pdfHeader));

    await expect(
      assertValidUploadedFile('/fake/doc.pdf', '', 'doc.pdf')
    ).resolves.toBe('application/pdf');
  });
});
