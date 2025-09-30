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
    expect(response.body.timestamp).toBeTruthy();
  });

  test('GET /api exposes service metadata', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'MyWeb API Server');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints.wallpapers).toBe('/api/wallpapers');
  });
});
