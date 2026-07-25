import request from 'supertest';
import { createApp } from '../src/appFactory.js';

describe('application health endpoints', () => {
  let app;
  let db;

  beforeAll(async () => {
    ({ app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    }));
  });

  afterAll(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  });

  test('GET /health responds with ok status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    // timestamp 字段已移除：健康检查仅返回存活状态，不暴露服务器时间戳
  });

  test('GET /api exposes service metadata', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'MyWeb API Server');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints.wallpapers).toBe('/api/wallpapers');
  });
});
