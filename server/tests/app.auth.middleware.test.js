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

  test('https requests receive Secure cookie via X-Forwarded-Proto', async () => {
    // app 设置了 trust proxy=loopback，supertest 走 loopback，可模拟代理后的 HTTPS
    const res = await request(app)
      .post('/api/auth/verify')
      .set('X-Forwarded-Proto', 'https')
      .send({ password: 'secret123' })
      .expect(200);

    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('Secure')])
    );
  });

  test('production plain-http login sets cookie without Secure so sessions persist', async () => {
    // 回归：生产模式曾无条件给 Cookie 加 Secure，纯 HTTP 部署下浏览器会
    // 丢弃该 Cookie，表现为每次刷新都要求重新输入密码
    const originalPassword = process.env.APP_PASSWORD;
    const originalSecret = process.env.APP_AUTH_SECRET;
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.APP_PASSWORD = 'secret123';
    process.env.APP_AUTH_SECRET = 'test-signing-secret';
    process.env.NODE_ENV = 'production';

    let isolatedDb;
    try {
      const { app: isolatedApp, db } = await createApp({
        dbPath: ':memory:',
        seedBuiltinApps: false,
        silentDbLogs: true,
      });
      isolatedDb = db;

      const res = await request(isolatedApp)
        .post('/api/auth/verify')
        .send({ password: 'secret123' })
        .expect(200);

      const setCookie = res.headers['set-cookie'][0];
      expect(setCookie).toContain('myweb_auth=');
      expect(setCookie).not.toMatch(/\bSecure\b/i);
    } finally {
      await isolatedDb?.close?.();
      if (originalSecret === undefined) {
        delete process.env.APP_AUTH_SECRET;
      } else {
        process.env.APP_AUTH_SECRET = originalSecret;
      }
      if (originalPassword === undefined) {
        delete process.env.APP_PASSWORD;
      } else {
        process.env.APP_PASSWORD = originalPassword;
      }
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test('blocks protected routes with 503 when production signing secret is missing', async () => {
    const originalSecret = process.env.APP_AUTH_SECRET;
    process.env.APP_PASSWORD = 'secret123';
    process.env.NODE_ENV = 'production';
    delete process.env.APP_AUTH_SECRET;

    const { app: isolatedApp, db: isolatedDb } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    const res = await request(isolatedApp).get('/api/apps').expect(503);

    expect(res.body.message).toContain('APP_AUTH_SECRET');

    await isolatedDb?.close?.();
    if (originalSecret === undefined) {
      delete process.env.APP_AUTH_SECRET;
    } else {
      process.env.APP_AUTH_SECRET = originalSecret;
    }
    process.env.NODE_ENV = 'test';
  });
});
