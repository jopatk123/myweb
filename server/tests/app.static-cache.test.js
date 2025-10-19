/* eslint-env jest */
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
        `public, max-age=${expectedMaxAge}, immutable`
      );
    } else {
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });
});
