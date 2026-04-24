import request from 'supertest';
import { createApp } from '../src/appFactory.js';

describe('application auth guard', () => {
  let app;
  let db;
  const originalPassword = process.env.APP_PASSWORD;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.APP_PASSWORD = 'secret123';
    process.env.NODE_ENV = 'test';

    ({ app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    }));
  });

  afterAll(async () => {
    await db?.close?.();

    if (originalPassword === undefined) {
      delete process.env.APP_PASSWORD;
    } else {
      process.env.APP_PASSWORD = originalPassword;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test('blocks protected api routes without auth cookie', async () => {
    const res = await request(app).get('/api/apps').expect(401);

    expect(res.body).toMatchObject({
      code: 401,
      success: false,
      authenticated: false,
    });
  });

  test('blocks uploads without auth cookie', async () => {
    const res = await request(app)
      .get('/uploads/files/example.txt')
      .expect(401);

    expect(res.body).toMatchObject({
      code: 401,
      success: false,
    });
  });

  test('verify sets auth cookie and unlocks protected routes', async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post('/api/auth/verify')
      .send({ password: 'secret123' })
      .expect(200);

    expect(loginRes.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('myweb_auth=')])
    );

    const statusRes = await agent.get('/api/auth/status').expect(200);
    expect(statusRes.body.data.authenticated).toBe(true);

    const appsRes = await agent.get('/api/apps').expect(200);
    expect(appsRes.body.code).toBe(200);
  });

  test('logout clears auth cookie and revokes access', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/verify')
      .send({ password: 'secret123' })
      .expect(200);

    const logoutRes = await agent.post('/api/auth/logout').expect(200);
    expect(logoutRes.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('myweb_auth=;')])
    );

    await agent.get('/api/apps').expect(401);
  });
});
