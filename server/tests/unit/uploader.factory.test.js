/**
 * uploader.js 工厂函数单元测试
 */
import path from 'path';
import os from 'os';
import {
  createUploader,
  imageOnlyFilter,
  imageUploadFilter,
} from '../../src/utils/uploader.js';

// ─── imageOnlyFilter ──────────────────────────────────────────────────────────

describe('imageOnlyFilter', () => {
  function callFilter(mimeType) {
    return new Promise((resolve, reject) => {
      const file = { mimetype: mimeType, originalname: 'test.jpg' };
      imageOnlyFilter(null, file, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  test('accepts image/jpeg', async () => {
    await expect(callFilter('image/jpeg')).resolves.toBe(true);
  });

  test('accepts image/png', async () => {
    await expect(callFilter('image/png')).resolves.toBe(true);
  });

  test('accepts image/webp', async () => {
    await expect(callFilter('image/webp')).resolves.toBe(true);
  });

  test('rejects application/pdf', async () => {
    await expect(callFilter('application/pdf')).rejects.toThrow(
      '只支持图片文件'
    );
  });

  test('rejects text/plain', async () => {
    await expect(callFilter('text/plain')).rejects.toThrow('只支持图片文件');
  });
});

// ─── imageUploadFilter ───────────────────────────────────────────────────────

describe('imageUploadFilter', () => {
  function callFilter(mimeType, originalname = 'test.jpg') {
    return new Promise((resolve, reject) => {
      const file = { mimetype: mimeType, originalname };
      imageUploadFilter(null, file, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  test('accepts image/jpeg', async () => {
    await expect(callFilter('image/jpeg')).resolves.toBe(true);
  });

  test('rejects video/mp4 with correct message', async () => {
    await expect(callFilter('video/mp4')).rejects.toThrow('只允许上传图片文件');
  });
});

// ─── createUploader factory ───────────────────────────────────────────────────

describe('createUploader', () => {
  test('returns a multer instance with .single and .array methods', () => {
    const uploader = createUploader({
      destination: os.tmpdir(),
      maxFileSize: 1024,
    });
    expect(typeof uploader.single).toBe('function');
    expect(typeof uploader.array).toBe('function');
    expect(typeof uploader.fields).toBe('function');
  });

  test('includes files limit when maxFiles is specified', () => {
    // We verify it builds without error; multer doesn't expose limits publicly
    expect(() =>
      createUploader({
        destination: os.tmpdir(),
        maxFileSize: 1024,
        maxFiles: 5,
      })
    ).not.toThrow();
  });

  test('uses defaultExt when creating uploader', () => {
    // Just verify the factory accepts the option without throwing
    expect(() =>
      createUploader({
        destination: os.tmpdir(),
        maxFileSize: 1024,
        defaultExt: '.jpg',
      })
    ).not.toThrow();
  });
});
