import request from 'supertest';
import express from 'express';
import { createHash } from 'crypto';

// Build a minimal Express app that mounts the auth routes
async function buildApp(password = '', nodeEnv = 'test') {
  // Set env before importing to ensure the route picks it up
  process.env.APP_PASSWORD = password;
  process.env.NODE_ENV = nodeEnv;

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
    NODE_ENV: process.env.NODE_ENV,
  };

  afterAll(() => {
    process.env.APP_PASSWORD = originalEnv.APP_PASSWORD || '';
    process.env.NODE_ENV = originalEnv.NODE_ENV || '';
  });

  describe('GET /api/auth/status', () => {
    test('returns required: false when no password set', async () => {
      const app = await buildApp('');
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(false);
      expect(res.body.data.configured).toBe(false);
    });

    test('returns required: true when password is set', async () => {
      const app = await buildApp('test-password');
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(true);
      expect(res.body.data.configured).toBe(true);
    });

    test('returns required: true in production when password is missing', async () => {
      const app = await buildApp('', 'production');
      const res = await request(app).get('/api/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(true);
      expect(res.body.data.configured).toBe(false);
    });
  });

  describe('POST /api/auth/verify', () => {
    test('succeeds when no password is configured', async () => {
      const app = await buildApp('');
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'anything' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('fails closed when password is missing in production', async () => {
      const app = await buildApp('', 'production');
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'anything' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('未配置');
    });

    test('rejects missing password', async () => {
      const app = await buildApp('secret123');
      const res = await request(app).post('/api/auth/verify').send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects wrong password', async () => {
      const app = await buildApp('secret123');
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('accepts correct plaintext password', async () => {
      const app = await buildApp('secret123');
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'secret123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('accepts correct sha256 hashed password', async () => {
      const plain = 'myPassword!';
      const hash = createHash('sha256').update(plain).digest('hex');
      const app = await buildApp(`sha256:${hash}`);

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: plain });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('rejects oversized password', async () => {
      const app = await buildApp('secret123');
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'x'.repeat(600) });
      expect(res.status).toBe(401);
    });
  });
});
