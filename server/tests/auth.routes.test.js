import request from 'supertest';
import express from 'express';
import { createHash } from 'crypto';

// Build a minimal Express app that mounts the auth routes
async function buildApp({
  password = '',
  nodeEnv = 'test',
  authSecret,
} = {}) {
  // Set env before importing to ensure the route picks it up
  process.env.APP_PASSWORD = password;
  process.env.NODE_ENV = nodeEnv;
  if (authSecret === undefined) delete process.env.APP_AUTH_SECRET;
  else process.env.APP_AUTH_SECRET = authSecret;

  // Dynamic import to re-read env each time
  const { createAuthRoutes } = await import('../src/routes/auth.routes.js');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRoutes());
  return app;
}

describe('Auth routes', () => {
  const originalEnv = {
    APP_PASSWORD: process.env.APP_PASSWORD,
    APP_AUTH_SECRET: process.env.APP_AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  afterAll(() => {
    if (originalEnv.APP_PASSWORD === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = originalEnv.APP_PASSWORD;

    if (originalEnv.APP_AUTH_SECRET === undefined) {
      delete process.env.APP_AUTH_SECRET;
    } else {
      process.env.APP_AUTH_SECRET = originalEnv.APP_AUTH_SECRET;
    }

    if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv.NODE_ENV;
  });

  describe('GET /api/auth/status', () => {
    test('returns required: false when no password set', async () => {
      const app = await buildApp();
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(false);
      expect(res.body.data.configured).toBe(false);
    });

    test('returns required: true when password is set', async () => {
      const app = await buildApp({ password: 'test-password' });
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(true);
      expect(res.body.data.configured).toBe(true);
    });

    test('returns required: true in production when password is missing', async () => {
      const app = await buildApp({ nodeEnv: 'production' });
      const res = await request(app).get('/api/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(true);
      expect(res.body.data.configured).toBe(false);
      expect(res.body.data.configIssue).toContain('APP_PASSWORD');
    });

    test('reports config issue when production secret is missing', async () => {
      const app = await buildApp({
        password: 'test-password',
        nodeEnv: 'production',
      });
      const res = await request(app).get('/api/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(true);
      expect(res.body.data.configured).toBe(true);
      expect(res.body.data.signingReady).toBe(false);
      expect(res.body.data.configIssue).toContain('APP_AUTH_SECRET');
    });
  });

  describe('POST /api/auth/verify', () => {
    test('succeeds when no password is configured', async () => {
      const app = await buildApp();
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'anything' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('fails closed when password is missing in production', async () => {
      const app = await buildApp({ nodeEnv: 'production' });
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'anything' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('APP_PASSWORD');
    });

    test('rejects missing password', async () => {
      const app = await buildApp({ password: 'secret123' });
      const res = await request(app).post('/api/auth/verify').send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects wrong password', async () => {
      const app = await buildApp({ password: 'secret123' });
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('accepts correct plaintext password', async () => {
      const app = await buildApp({ password: 'secret123' });
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'secret123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('accepts correct sha256 hashed password', async () => {
      const plain = 'myPassword!';
      const hash = createHash('sha256').update(plain).digest('hex');
      const app = await buildApp({ password: `sha256:${hash}` });

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: plain });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('rejects oversized password', async () => {
      const app = await buildApp({ password: 'secret123' });
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'x'.repeat(600) });
      expect(res.status).toBe(401);
    });

    test('fails closed when production secret is missing', async () => {
      const app = await buildApp({
        password: 'secret123',
        nodeEnv: 'production',
      });
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'secret123' });

      expect(res.status).toBe(503);
      expect(res.body.message).toContain('APP_AUTH_SECRET');
    });

    test('accepts correct password in production when secret is configured', async () => {
      const app = await buildApp({
        password: 'secret123',
        nodeEnv: 'production',
        authSecret: 'server-signing-secret',
      });
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'secret123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
