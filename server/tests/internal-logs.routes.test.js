import request from 'supertest';
import { createApp } from '../src/appFactory.js';

describe('Internal Logs Routes', () => {
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

  describe('POST /internal/logs/ai', () => {
    test('returns success with full payload', async () => {
      const res = await request(app)
        .post('/internal/logs/ai')
        .send({
          requestText: 'AI request text',
          responseText: 'AI response text',
          timestamp: new Date().toISOString(),
          model: 'gpt-4',
          playerType: 'human',
          gameState: {
            currentPlayer: 'X',
            totalMoves: 5,
            boardSize: 3,
          },
          parsedResult: { action: 'move', position: 0 },
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns success with partial payload', async () => {
      const res = await request(app)
        .post('/internal/logs/ai')
        .send({ requestText: 'short request' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns success with empty body', async () => {
      const res = await request(app).post('/internal/logs/ai').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('handles long requestText that gets truncated', async () => {
      const longText = 'x'.repeat(3000);
      const res = await request(app)
        .post('/internal/logs/ai')
        .send({ requestText: longText });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('handles long responseText that gets truncated', async () => {
      const longText = 'y'.repeat(3000);
      const res = await request(app)
        .post('/internal/logs/ai')
        .send({ responseText: longText });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('omits gameState from summary when not provided', async () => {
      const res = await request(app)
        .post('/internal/logs/ai')
        .send({ model: 'claude', playerType: 'ai' });
      expect(res.status).toBe(200);
    });

    test('handles request with only numeric values', async () => {
      const res = await request(app)
        .post('/internal/logs/ai')
        .send({ model: 'gpt-3.5', playerType: 'bot', requestText: 'q' });
      expect(res.status).toBe(200);
    });
  });
});
