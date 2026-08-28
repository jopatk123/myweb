import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { createApp } from '../src/appFactory.js';
import { appEnv } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../uploads');
const testFileName = '__cache-control-test__.txt';
const testFilePath = path.join(uploadsRoot, testFileName);

let app;
let db;

describe('uploads static caching', () => {
  beforeAll(async () => {
    await fs.mkdir(uploadsRoot, { recursive: true });
    await fs.writeFile(testFilePath, 'static-cache-test');

    const created = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    });

    app = created.app;
    db = created.db;
  });

  afterAll(async () => {
    await fs.unlink(testFilePath).catch(() => {});
    db?.close?.();
  });

  it('returns long-lived cache headers for uploaded files', async () => {
    const response = await request(app).get(`/uploads/${testFileName}`);

    expect(response.status).toBe(200);
    const expectedMaxAge = Math.max(
      0,
      Number(appEnv.staticAssets.uploadsCacheMaxAgeSeconds) || 0
    );

    if (expectedMaxAge > 0) {
      expect(response.headers['cache-control']).toBe(
        `private, max-age=${expectedMaxAge}, immutable`
      );
    } else {
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });
});

describe('client static & api caching', () => {
  // 使用独立临时目录模拟 client/dist，避免与真实构建产物或其他测试文件竞态
  const clientDistDir = path.join(__dirname, 'tmp-spa-dist');
  const clientAssetsDir = path.join(clientDistDir, 'assets');
  const assetFileName = '__cache-test-asset-abc123__.js';
  const assetFilePath = path.join(clientAssetsDir, assetFileName);

  let spaApp;
  let spaDb;

  beforeAll(async () => {
    await fs.mkdir(clientAssetsDir, { recursive: true });
    await fs.writeFile(assetFilePath, 'console.log("cache-test-asset");');
    await fs.writeFile(
      path.join(clientDistDir, 'index.html'),
      '<html><body>spa-cache-test</body></html>'
    );

    const created = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
      clientDistDir,
    });

    spaApp = created.app;
    spaDb = created.db;
  });

  afterAll(async () => {
    await fs.rm(clientDistDir, { recursive: true, force: true });
    spaDb?.close?.();
  });

  it('serves hashed build assets with one-year immutable cache', async () => {
    const response = await request(spaApp).get(`/assets/${assetFileName}`);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable'
    );
  });

  it('serves index.html with no-cache for revalidation', async () => {
    const response = await request(spaApp).get('/index.html');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('sends no-cache on the SPA fallback route', async () => {
    const response = await request(spaApp).get('/some-spa-route');

    expect(response.status).toBe(200);
    expect(response.text).toContain('spa-cache-test');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('marks API responses as no-store', async () => {
    const listResponse = await request(spaApp).get('/api');

    expect(listResponse.status).toBe(200);
    expect(listResponse.headers['cache-control']).toBe('no-store');

    const notFoundResponse = await request(spaApp).get('/api/not-existing');

    expect(notFoundResponse.status).toBe(404);
    expect(notFoundResponse.headers['cache-control']).toBe('no-store');
  });
});
