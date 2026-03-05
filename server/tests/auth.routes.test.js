import request from 'supertest';
import express from 'express';
import { createHash } from 'crypto';

// Build a minimal Express app that mounts the auth routes
async function buildApp(password = '') {
  // Set env before importing to ensure the route picks it up
  process.env.APP_PASSWORD = password;

  // Dynamic import to re-read env each time
  const { createAuthRoutes } = await import('../src/routes/auth.routes.js');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRoutes());
  return app;
}

describe('Auth routes', () => {
  const originalEnv = process.env.APP_PASSWORD;

  afterAll(() => {
    process.env.APP_PASSWORD = originalEnv || '';
  });

  describe('GET /api/auth/status', () => {
    test('returns required: false when no password set', async () => {
      const app = await buildApp('');
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(false);
    });

    test('returns required: true when password is set', async () => {
      const app = await buildApp('test-password');
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.data.required).toBe(true);
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
