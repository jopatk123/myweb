import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { createApp } from '../src/appFactory.js';
import { FileService } from '../src/services/file.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads/files');

describe('Files API routes', () => {
  let app;
  let db;
  const createdFiles = [];
  const ADMIN_TOKEN = 'test-admin-token';

  beforeAll(async () => {
    process.env.FILES_ADMIN_TOKEN = ADMIN_TOKEN;
    ({ app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
    }));
  });

  afterAll(async () => {
    delete process.env.FILES_ADMIN_TOKEN;
    await db?.close?.();
  });

  afterEach(async () => {
    for (const filePath of createdFiles.splice(0)) {
      await fs.rm(filePath, { force: true });
    }
    db.prepare('DELETE FROM files').run();
    jest.restoreAllMocks();
  });

  test('rejects upload without admin token', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', Buffer.from('secret'), 'secret.txt')
      .expect(401);

    expect(res.body).toMatchObject({
      code: 401,
      success: false,
    });
    const count = db.prepare('SELECT COUNT(*) as total FROM files').get().total;
    expect(count).toBe(0);
  });

  test('accepts upload with valid token and stores metadata', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .attach('file', Buffer.from('hello world'), 'hello.txt')
      .expect(201);

    expect(res.body.success).toBe(true);
    const payload = Array.isArray(res.body.data)
      ? res.body.data[0]
      : res.body.data;
    expect(payload).toBeDefined();
    expect(payload.original_name || payload.originalName).toBe('hello.txt');

    const storedName = payload.stored_name || payload.storedName;
    if (storedName) {
      const diskPath = path.join(uploadsDir, storedName);
      createdFiles.push(diskPath);
      await expect(fs.stat(diskPath)).resolves.toBeDefined();
    }

    const row = storedName
      ? db.prepare('SELECT * FROM files WHERE stored_name = ?').get(storedName)
      : null;
    expect(row).toBeTruthy();
  });

  test('ignores untrusted x-api-base header when building file url', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .set('X-Api-Base', 'https://evil.example.com/api')
      .attach('file', Buffer.from('hello world'), 'safe.txt')
      .expect(201);

    const payload = Array.isArray(res.body.data)
      ? res.body.data[0]
      : res.body.data;
    const storedName = payload.stored_name || payload.storedName;
    const fileUrl = payload.file_url || payload.fileUrl;

    expect(fileUrl).toBeTruthy();
    expect(fileUrl).not.toContain('evil.example.com');
    expect(fileUrl).toContain(`/uploads/files/${storedName}`);

    if (storedName) {
      createdFiles.push(path.join(uploadsDir, storedName));
    }
  });

  test('blocks disallowed file types', async () => {
    process.env.FILE_ALLOW_ALL_TYPES = 'false';
    try {
      const res = await request(app)
        .post('/api/files/upload')
        .set('X-Admin-Token', ADMIN_TOKEN)
        .attach('file', Buffer.from('MZ'), 'malware.exe')
        .expect(400);

      expect(res.body.message).toBe('不支持的文件类型');
      const total = db
        .prepare('SELECT COUNT(*) as total FROM files')
        .get().total;
      expect(total).toBe(0);
    } finally {
      delete process.env.FILE_ALLOW_ALL_TYPES;
    }
  });

  test('clamps pagination limit to 100', async () => {
    // Seed a dummy record directly
    const insert = db.prepare(`
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category, file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      'seed.txt',
      'seed.txt',
      'uploads/files/seed.txt',
      'text/plain',
      4,
      'other',
      null
    );

    // Joi 验证最大 limit 为 200，底层 model 会再钳到 100
    const res = await request(app)
      .get('/api/files')
      .query({ limit: 200 })
      .expect(200);

    expect(res.body.data.pagination.limit).toBeLessThanOrEqual(100);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test('prevents downloading files outside uploads directory', async () => {
    const stmt = db.prepare(`
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      'escape.txt',
      'escape.txt',
      '../escape.txt',
      'text/plain',
      1,
      'other'
    );

    const res = await request(app)
      .get(`/api/files/${result.lastInsertRowid}/download`)
      .expect(400);

    expect(res.body.message).toBe('非法的文件路径');
  });

  test('returns 400 when uploading with no files', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('GET /api/files/:id returns file detail', async () => {
    const stmt = db.prepare(`
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      'detail.txt',
      'detail.txt',
      'uploads/files/detail.txt',
      'text/plain',
      5,
      'other'
    );
    const id = result.lastInsertRowid;

    const res = await request(app).get(`/api/files/${id}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('DELETE /api/files/:id deletes file', async () => {
    const uploadRes = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .attach('file', Buffer.from('delete me'), 'todelete.txt')
      .expect(201);

    const payload = Array.isArray(uploadRes.body.data)
      ? uploadRes.body.data[0]
      : uploadRes.body.data;
    const storedName = payload.stored_name || payload.storedName;
    if (storedName) createdFiles.push(path.join(uploadsDir, storedName));

    const id = payload.id;

    const res = await request(app)
      .delete(`/api/files/${id}`)
      .set('X-Admin-Token', ADMIN_TOKEN)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('download returns 404 when file does not exist on disk', async () => {
    const stmt = db.prepare(`
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      'ghost.txt',
      'ghost-nonexistent.txt',
      'uploads/files/ghost-nonexistent-12345.txt',
      'text/plain',
      1,
      'other'
    );

    const res = await request(app)
      .get(`/api/files/${result.lastInsertRowid}/download`)
      .expect(404);

    expect(res.body.code).toBe(404);
  });

  test('accepts upload with trusted x-api-base header and uses it for url', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .set('Host', 'localhost:3000')
      .set('X-Api-Base', 'http://localhost:3000')
      .attach('file', Buffer.from('trusted api base test'), 'trusted.txt')
      .expect(201);

    expect(res.body.success).toBe(true);
    const payload = Array.isArray(res.body.data)
      ? res.body.data[0]
      : res.body.data;
    const storedName = payload.stored_name || payload.storedName;
    if (storedName) createdFiles.push(path.join(uploadsDir, storedName));

    const fileUrl = payload.file_url || payload.fileUrl;
    expect(fileUrl).toContain('localhost:3000');
  });

  test('upload multiple files returns array', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .attach('file', Buffer.from('file one'), 'multi1.txt')
      .attach('file', Buffer.from('file two'), 'multi2.txt')
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);

    for (const item of res.body.data) {
      const storedName = item.stored_name || item.storedName;
      if (storedName) createdFiles.push(path.join(uploadsDir, storedName));
    }
  });

  test('GET /api/files filters by type', async () => {
    db.prepare(
      `
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category)
      VALUES ('img.png', 'img.png', 'uploads/files/img.png', 'image/png', 10, 'image')
    `
    ).run();
    db.prepare(
      `
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category)
      VALUES ('doc.pdf', 'doc.pdf', 'uploads/files/doc.pdf', 'application/pdf', 20, 'other')
    `
    ).run();

    const res = await request(app)
      .get('/api/files')
      .query({ type: 'image' })
      .expect(200);

    expect(res.body.success).toBe(true);
    // All returned files should be of type image
    for (const file of res.body.data.files) {
      expect(file.type_category || file.typeCategory).toBe('image');
    }
  });

  test('GET /api/files filters by search term', async () => {
    db.prepare(
      `
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category)
      VALUES ('searchable-unique-xyz.txt', 'searchable-unique-xyz.txt', 'uploads/files/searchable-unique-xyz.txt', 'text/plain', 5, 'other')
    `
    ).run();

    const res = await request(app)
      .get('/api/files')
      .query({ search: 'searchable-unique-xyz' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.files.length).toBeGreaterThanOrEqual(1);
    const found = res.body.data.files.some(f =>
      (f.original_name || f.originalName).includes('searchable-unique-xyz')
    );
    expect(found).toBe(true);
  });

  test('upload cleans disk files when createMany throws', async () => {
    jest.spyOn(FileService.prototype, 'createMany').mockImplementation(() => {
      throw new Error('createMany failed');
    });

    const unlinkSpy = jest
      .spyOn(fs, 'unlink')
      .mockRejectedValueOnce(
        Object.assign(new Error('cleanup denied'), { code: 'EACCES' })
      );

    const res = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .attach('file', Buffer.from('rollback me'), 'rollback.txt')
      .expect(500);

    expect(res.body.code).toBe(500);
    expect(unlinkSpy).toHaveBeenCalled();
  });

  test('GET /api/files returns 500 when service.list throws', async () => {
    jest.spyOn(FileService.prototype, 'list').mockImplementation(() => {
      throw new Error('list failed');
    });

    const res = await request(app).get('/api/files').expect(500);
    expect(res.body.code).toBe(500);
  });

  test('GET /api/files/:id returns 500 when service.get throws', async () => {
    jest.spyOn(FileService.prototype, 'get').mockImplementation(() => {
      throw new Error('get failed');
    });

    const res = await request(app).get('/api/files/1').expect(500);
    expect(res.body.code).toBe(500);
  });

  test('DELETE /api/files/:id returns 500 when service.remove throws', async () => {
    jest
      .spyOn(FileService.prototype, 'remove')
      .mockRejectedValueOnce(new Error('remove failed'));

    const res = await request(app)
      .delete('/api/files/1')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .expect(500);

    expect(res.body.code).toBe(500);
  });
});
