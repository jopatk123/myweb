import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistDir = path.join(__dirname, '../../client/dist');
const clientIndexPath = path.join(clientDistDir, 'index.html');
const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  Object.keys(process.env).forEach(key => {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, ORIGINAL_ENV);
}

async function loadCreateApp() {
  jest.resetModules();
  return import('../src/appFactory.js');
}

afterEach(() => {
  restoreEnv();
  jest.resetModules();
});

describe('appFactory branch coverage', () => {
  test('denies unknown CORS origin by not returning allow-origin header', async () => {
    delete process.env.CORS_ORIGIN;

    const { createApp } = await loadCreateApp();
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    const res = await request(app)
      .get('/api')
      .set('Origin', 'http://evil.example.test')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    db.close();
  });

  test('allows all CORS origins when CORS_ORIGIN is wildcard', async () => {
    process.env.CORS_ORIGIN = '*';

    const { createApp } = await loadCreateApp();
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    const origin = 'http://random-origin.example.test';
    const res = await request(app)
      .get('/api')
      .set('Origin', origin)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(origin);
    db.close();
  });

  test('returns 404 json for unknown API path', async () => {
    const { createApp } = await loadCreateApp();
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    const res = await request(app).get('/api/not-existing-route').expect(404);

    expect(res.body.code).toBe(404);
    expect(res.body.path).toBe('/api/not-existing-route');
    db.close();
  });

  test('serves client index.html for non-api paths', async () => {
    await fs.mkdir(clientDistDir, { recursive: true });
    await fs.writeFile(
      clientIndexPath,
      '<html><body>fallback-index</body></html>'
    );

    const { createApp } = await loadCreateApp();
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    const res = await request(app).get('/non-api-route').expect(200);

    expect(res.text).toContain('fallback-index');

    db.close();
    await fs.rm(clientIndexPath, { force: true });
  });

  test('enables HSTS when ENABLE_HTTPS_SECURITY is set', async () => {
    process.env.ENABLE_HTTPS_SECURITY = '1';

    const { createApp } = await loadCreateApp();
    const { app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    const res = await request(app).get('/health').expect(200);

    expect(res.headers['strict-transport-security']).toBeDefined();
    db.close();
  });
});
