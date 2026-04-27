import request from 'supertest';
import { jest } from '@jest/globals';

function getCspHeader(response) {
  return (
    response.headers['content-security-policy'] ||
    response.headers['Content-Security-Policy'] ||
    ''
  );
}

describe('Content-Security-Policy external API origins', () => {
  const originalApiBase = process.env.VITE_API_BASE;
  const originalDeployApiBase = process.env.DEPLOY_VITE_API_BASE;

  afterEach(() => {
    if (originalApiBase === undefined) {
      delete process.env.VITE_API_BASE;
    } else {
      process.env.VITE_API_BASE = originalApiBase;
    }

    if (originalDeployApiBase === undefined) {
      delete process.env.DEPLOY_VITE_API_BASE;
    } else {
      process.env.DEPLOY_VITE_API_BASE = originalDeployApiBase;
    }

    jest.resetModules();
  });

  test('connect-src includes configured external API and websocket origins', async () => {
    process.env.VITE_API_BASE = 'https://api.example.com/api';
    jest.resetModules();

    const { createApp } = await import('../src/appFactory.js');
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    try {
      const response = await request(app).get('/api').expect(200);
      const csp = getCspHeader(response);

      expect(csp).toContain('connect-src');
      expect(csp).toContain('https://api.example.com');
      expect(csp).toContain('wss://api.example.com');
    } finally {
      await db?.close?.();
    }
  });
});
