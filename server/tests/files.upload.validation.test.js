import request from 'supertest';
import { jest } from '@jest/globals';

describe('file upload validation', () => {
  afterEach(() => {
    delete process.env.FILE_MAX_UPLOAD_SIZE;
    delete process.env.FILES_ADMIN_TOKEN;
    delete process.env.FILES_ADMIN_TOKEN_HASH;
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
});
