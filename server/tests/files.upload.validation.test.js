import request from 'supertest';
import { jest } from '@jest/globals';

describe('file upload validation', () => {
  afterEach(() => {
    delete process.env.FILE_MAX_UPLOAD_SIZE;
    delete process.env.FILE_ALLOW_ALL_TYPES;
    jest.resetModules();
  });

  test('rejects files larger than configured limit', async () => {
    process.env.FILE_MAX_UPLOAD_SIZE = '10b';

    jest.resetModules();
    const { createApp } = await import('../src/appFactory.js');
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    try {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.alloc(20, 1), {
          filename: 'too-big.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '文件大小超出限制');
    } finally {
      db?.close?.();
    }
  });

  test('rejects unsupported file types', async () => {
    process.env.FILE_MAX_UPLOAD_SIZE = '1mb';
    process.env.FILE_ALLOW_ALL_TYPES = 'false';

    jest.resetModules();
    const { createApp } = await import('../src/appFactory.js');
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    try {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('hello'), {
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '不支持的文件类型');
    } finally {
      db?.close?.();
    }
  });

  test('rejects unexpected multipart field name', async () => {
    process.env.FILE_MAX_UPLOAD_SIZE = '1mb';

    jest.resetModules();
    const { createApp } = await import('../src/appFactory.js');
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    try {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('files', Buffer.from('hello'), {
          filename: 'a.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '上传字段不正确');
    } finally {
      db?.close?.();
    }
  });

  test('rejects more files than configured per-request limit with 400', async () => {
    process.env.FILE_MAX_UPLOAD_SIZE = '1mb';
    process.env.FILE_MAX_UPLOAD_FILES = '2';

    jest.resetModules();
    const { createApp } = await import('../src/appFactory.js');
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    try {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('one'), { filename: 'one.txt' })
        .attach('file', Buffer.from('two'), { filename: 'two.txt' })
        .attach('file', Buffer.from('three'), { filename: 'three.txt' });

      // 超出单次数量限制应返回 400 而非 500
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        '单次上传文件数量超出限制'
      );

      const count = db
        .prepare('SELECT COUNT(*) as total FROM files')
        .get().total;
      expect(count).toBe(0);
    } finally {
      db?.close?.();
    }
  });

  test('rejects xhtml extension even with faked content type', async () => {
    process.env.FILE_MAX_UPLOAD_SIZE = '1mb';

    jest.resetModules();
    const { createApp } = await import('../src/appFactory.js');
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    try {
      // 客户端可用 application/octet-stream 伪造 MIME 绕过 MIME 黑名单，
      // 扩展名黑名单需兜底拦截 .xhtml（浏览器会按 HTML 渲染）
      for (const filename of ['evil.xhtml', 'evil.xht']) {
        const response = await request(app)
          .post('/api/files/upload')
          .attach('file', Buffer.from('<html></html>'), {
            filename,
            contentType: 'application/octet-stream',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', '不支持的文件类型');
      }

      const count = db
        .prepare('SELECT COUNT(*) as total FROM files')
        .get().total;
      expect(count).toBe(0);
    } finally {
      db?.close?.();
    }
  });
});
