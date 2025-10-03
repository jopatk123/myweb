/* eslint-env jest */
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { createApp } from '../src/appFactory.js';

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
    db.prepare('DELETE FROM novels').run();
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

  test('blocks disallowed file types', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .attach('file', Buffer.from('MZ'), 'malware.exe')
      .expect(400);

    expect(res.body.message).toBe('不支持的文件类型');
    const total = db.prepare('SELECT COUNT(*) as total FROM files').get().total;
    expect(total).toBe(0);
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

    const res = await request(app)
      .get('/api/files')
      .query({ limit: 1000 })
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
});
