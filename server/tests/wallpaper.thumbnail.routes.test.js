/* eslint-env jest */
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { createApp } from '../src/appFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, '../uploads');
const wallpapersDir = path.join(uploadsRoot, 'wallpapers');
const thumbnailsDir = path.join(wallpapersDir, 'thumbnails');

describe('Wallpaper thumbnail endpoint', () => {
  let app;
  let db;
  const cleanupTargets = new Set();

  beforeAll(async () => {
    ({ app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    }));
  });

  afterAll(async () => {
    for (const target of cleanupTargets) {
      await fs.rm(target, { force: true });
    }
    cleanupTargets.clear();
    await db?.close?.();
  });

  afterEach(() => {
    db.prepare('DELETE FROM wallpapers').run();
  });

  test('generates, caches and reuses thumbnails with proper headers', async () => {
    const imageBuffer = await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 3,
        background: { r: 120, g: 180, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const uploadResponse = await request(app)
      .post('/api/wallpapers')
      .attach('image', imageBuffer, 'sample.png')
      .expect(201);

    const payload = uploadResponse.body.data;
    expect(payload).toBeDefined();
    const wallpaperId = payload.id;
    const storedFilename = payload.filename || payload.file_name;
    const filePath = payload.file_path || payload.filePath;

    const absoluteOriginalPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, '..', filePath);
    cleanupTargets.add(absoluteOriginalPath);

    const thumbName = `${path.parse(storedFilename).name}-160xauto.jpeg`;
    const cachedThumbPath = path.join(thumbnailsDir, thumbName);
    cleanupTargets.add(cachedThumbPath);

    const firstRes = await request(app)
      .get(`/api/wallpapers/${wallpaperId}/thumbnail`)
      .query({ w: 160, format: 'jpeg' })
      .buffer()
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(firstRes.headers['content-type']).toBe('image/jpeg');
    expect(firstRes.headers['cache-control']).toContain('max-age=2592000');
    expect(firstRes.headers.etag).toBeDefined();
    expect(firstRes.body.length).toBeGreaterThan(0);

    await expect(fs.stat(cachedThumbPath)).resolves.toBeDefined();

    const secondRes = await request(app)
      .get(`/api/wallpapers/${wallpaperId}/thumbnail`)
      .set('If-None-Match', firstRes.headers.etag)
      .query({ w: 160, format: 'jpeg' })
      .expect(304);

    expect(secondRes.headers.etag).toBe(firstRes.headers.etag);
    expect(secondRes.text).toBe('');
  });

  test('deleting wallpaper removes cached thumbnails', async () => {
    const imageBuffer = await sharp({
      create: {
        width: 400,
        height: 225,
        channels: 3,
        background: { r: 10, g: 80, b: 120 },
      },
    })
      .webp()
      .toBuffer();

    const uploadResponse = await request(app)
      .post('/api/wallpapers')
      .attach('image', imageBuffer, 'delete-me.webp')
      .expect(201);

    const payload = uploadResponse.body.data;
    const wallpaperId = payload.id;
    const storedFilename = payload.filename || payload.file_name;
    const originalPath = payload.file_path || payload.filePath;

    const absoluteOriginalPath = path.isAbsolute(originalPath)
      ? originalPath
      : path.join(__dirname, '..', originalPath);
    cleanupTargets.add(absoluteOriginalPath);

    const thumbName = `${path.parse(storedFilename).name}-200xauto.webp`;
    const cachedThumbPath = path.join(thumbnailsDir, thumbName);
    cleanupTargets.add(cachedThumbPath);

    await request(app)
      .get(`/api/wallpapers/${wallpaperId}/thumbnail`)
      .query({ w: 200, format: 'webp' })
      .expect(200);

    await expect(fs.stat(cachedThumbPath)).resolves.toBeDefined();

    await request(app).delete(`/api/wallpapers/${wallpaperId}`).expect(200);

    await expect(fs.stat(absoluteOriginalPath)).rejects.toThrow();
    await expect(fs.stat(cachedThumbPath)).rejects.toThrow();
    cleanupTargets.delete(cachedThumbPath);
  });
});
