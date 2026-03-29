/**
 * file routes 集成测试 - 覆盖新增的 Joi 验证中间件
 */
import request from 'supertest';
import { createApp } from '../src/appFactory.js';

describe('File routes - Joi validation', () => {
  let app;
  let db;
  const ADMIN_TOKEN = 'joi-test-token';

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

  afterEach(() => {
    db.prepare('DELETE FROM files').run();
  });

  // ─── GET /api/files 列表参数验证 ────────────────────────────────────────────

  test('GET /api/files rejects limit > 200 with 400', async () => {
    const res = await request(app).get('/api/files').query({ limit: 201 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  test('GET /api/files rejects page = 0 with 400', async () => {
    const res = await request(app).get('/api/files').query({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  test('GET /api/files accepts valid query params with 200', async () => {
    const res = await request(app)
      .get('/api/files')
      .query({ page: 1, limit: 20 });
    expect(res.status).toBe(200);
  });

  // ─── GET /api/files/:id 路径参数验证 ───────────────────────────────────────

  test('GET /api/files/:id rejects string id with 400', async () => {
    const res = await request(app).get('/api/files/abc');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  test('GET /api/files/:id rejects id = 0 with 400', async () => {
    const res = await request(app).get('/api/files/0');
    expect(res.status).toBe(400);
  });

  test('GET /api/files/:id rejects negative id with 400', async () => {
    const res = await request(app).get('/api/files/-1');
    expect(res.status).toBe(400);
  });

  test('GET /api/files/:id returns 404 for valid but non-existent id', async () => {
    const res = await request(app).get('/api/files/99999');
    expect(res.status).toBe(404);
  });

  // ─── GET /api/files/:id/download 路径参数验证 ──────────────────────────────

  test('GET /api/files/:id/download rejects string id with 400', async () => {
    const res = await request(app).get('/api/files/bad/download');
    expect(res.status).toBe(400);
  });

  // ─── DELETE /api/files/:id 路径参数验证 ───────────────────────────────────

  test('DELETE /api/files/:id rejects string id with 400', async () => {
    const res = await request(app)
      .delete('/api/files/notanid')
      .set('X-Admin-Token', ADMIN_TOKEN);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  test('DELETE /api/files/:id returns 404 for valid but non-existent id', async () => {
    const res = await request(app)
      .delete('/api/files/99999')
      .set('X-Admin-Token', ADMIN_TOKEN);
    expect(res.status).toBe(404);
  });
});
