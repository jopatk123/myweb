import request from 'supertest';
import { createApp } from '../src/appFactory.js';
import { hashToken } from '../src/utils/crypto.js';

describe('Agent API Bearer Token Authentication', () => {
  let app;
  let db;
  const originalAgentToken = process.env.AGENT_API_TOKEN;
  const originalPassword = process.env.APP_PASSWORD;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    if (originalAgentToken === undefined) {
      delete process.env.AGENT_API_TOKEN;
    } else {
      process.env.AGENT_API_TOKEN = originalAgentToken;
    }
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

  afterEach(async () => {
    await db?.close?.();
  });

  describe('without AGENT_API_TOKEN configured', () => {
    beforeEach(async () => {
      delete process.env.AGENT_API_TOKEN;
      process.env.APP_PASSWORD = 'secret123';

      ({ app, db } = await createApp({
        dbPath: ':memory:',
        seedBuiltinApps: false,
        silentDbLogs: true,
      }));
    });

    test('rejects Bearer token when token not configured', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', 'Bearer some-token')
        .expect(401);

      expect(res.body).toMatchObject({
        code: 401,
        success: false,
        authenticated: false,
      });
    });

    test('cookie auth still works when agent token not configured', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/verify')
        .send({ password: 'secret123' })
        .expect(200);

      const res = await agent.get('/api/messages').expect(200);
      expect(res.body.code).toBe(200);
    });
  });

  describe('with AGENT_API_TOKEN configured (plaintext)', () => {
    const testToken = 'test-agent-token-12345';

    beforeEach(async () => {
      process.env.AGENT_API_TOKEN = testToken;
      process.env.APP_PASSWORD = 'secret123';

      ({ app, db } = await createApp({
        dbPath: ':memory:',
        seedBuiltinApps: false,
        silentDbLogs: true,
      }));
    });

    test('allows access to /api/messages with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    test('allows access to /api/notebook with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/notebook')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
    });

    test('allows creating messages with valid Bearer token', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          content: 'Test message from agent',
          authorName: 'AI Agent',
          authorColor: '#3b82f6',
        })
        .expect(200);

      expect(res.body.code).toBe(200);
      expect(res.body.data.content).toBe('Test message from agent');
      expect(res.body.data.authorName).toBe('AI Agent');
    });

    test('allows creating notebook notes with valid Bearer token', async () => {
      const res = await request(app)
        .post('/api/notebook')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Agent Note',
          description: 'Created by agent',
          category: 'automation',
          priority: 'medium',
        })
        .expect(201);

      expect(res.body.code).toBe(201);
      expect(res.body.data.title).toBe('Agent Note');
    });

    test('rejects invalid Bearer token', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', 'Bearer wrong-token')
        .expect(401);

      expect(res.body).toMatchObject({
        code: 401,
        success: false,
        authenticated: false,
      });
    });

    test('rejects malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', 'NotBearer token')
        .expect(401);

      expect(res.body.code).toBe(401);
    });

    test('rejects missing Authorization header', async () => {
      const res = await request(app).get('/api/messages').expect(401);

      expect(res.body.code).toBe(401);
    });

    test('cookie auth still works alongside Bearer token', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/verify')
        .send({ password: 'secret123' })
        .expect(200);

      const res = await agent.get('/api/messages').expect(200);
      expect(res.body.code).toBe(200);
    });

    test('case-insensitive Bearer scheme', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `bearer ${testToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
    });

    test('accepts Bearer token with extra whitespace after scheme', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer  ${testToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
    });
  });

  describe('with AGENT_API_TOKEN configured (sha256 hash)', () => {
    const plainToken = 'my-secret-agent-token';
    const hashedToken = hashToken(plainToken);

    beforeEach(async () => {
      process.env.AGENT_API_TOKEN = hashedToken;
      process.env.APP_PASSWORD = 'secret123';

      ({ app, db } = await createApp({
        dbPath: ':memory:',
        seedBuiltinApps: false,
        silentDbLogs: true,
      }));
    });

    test('accepts plaintext token when env has sha256 hash', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
    });

    test('rejects wrong token when env has sha256 hash', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', 'Bearer wrong-token')
        .expect(401);

      expect(res.body.code).toBe(401);
    });

    test('rejects the hash itself as Bearer token', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${hashedToken}`)
        .expect(401);

      expect(res.body.code).toBe(401);
    });
  });

  describe('timing-safe comparison', () => {
    const testToken = 'exact-length-token-abc';

    beforeEach(async () => {
      process.env.AGENT_API_TOKEN = testToken;
      process.env.APP_PASSWORD = 'secret123';

      ({ app, db } = await createApp({
        dbPath: ':memory:',
        seedBuiltinApps: false,
        silentDbLogs: true,
      }));
    });

    test('rejects token with different length', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', 'Bearer short')
        .expect(401);

      expect(res.body.code).toBe(401);
    });

    test('rejects token differing in last character', async () => {
      const almostCorrect = testToken.slice(0, -1) + 'x';
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${almostCorrect}`)
        .expect(401);

      expect(res.body.code).toBe(401);
    });
  });

  describe('integration with other protected routes', () => {
    const testToken = 'integration-test-token';

    beforeEach(async () => {
      process.env.AGENT_API_TOKEN = testToken;
      process.env.APP_PASSWORD = 'secret123';

      ({ app, db } = await createApp({
        dbPath: ':memory:',
        seedBuiltinApps: true,
        silentDbLogs: true,
      }));
    });

    test('allows access to /api/apps with Bearer token', async () => {
      const res = await request(app)
        .get('/api/apps')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
    });

    test('allows access to /api/wallpapers with Bearer token', async () => {
      const res = await request(app)
        .get('/api/wallpapers')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
    });

    test('allows access to /api/files with Bearer token', async () => {
      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.code).toBe(200);
    });

    test('allows access to /uploads with Bearer token', async () => {
      await request(app)
        .get('/uploads/files/nonexistent.txt')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });
  });

  describe('no password required mode', () => {
    beforeEach(async () => {
      delete process.env.APP_PASSWORD;
      process.env.AGENT_API_TOKEN = 'test-token';
      process.env.NODE_ENV = 'development';

      ({ app, db } = await createApp({
        dbPath: ':memory:',
        seedBuiltinApps: false,
        silentDbLogs: true,
      }));
    });

    test('allows access without any auth when APP_PASSWORD not set', async () => {
      const res = await request(app).get('/api/messages').expect(200);

      expect(res.body.code).toBe(200);
    });

    test('Bearer token not checked when password not required', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', 'Bearer any-token')
        .expect(200);

      expect(res.body.code).toBe(200);
    });
  });
});
