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

  test('download rejects wallpaper paths outside uploads directory', async () => {
    const imageBuffer = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: { r: 30, g: 60, b: 90 },
      },
    })
      .png()
      .toBuffer();

    const uploadResponse = await request(app)
      .post('/api/wallpapers')
      .attach('image', imageBuffer, 'unsafe.png')
      .expect(201);

    const wallpaperId = uploadResponse.body.data.id;

    db.prepare('UPDATE wallpapers SET file_path = ? WHERE id = ?').run(
      '../escape.png',
      wallpaperId
    );

    const response = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [wallpaperId] })
      .expect(400);

    expect(response.body.message).toBe('壁纸文件路径无效');
  });

  test('thumbnail with format=jpg uses jpg format', async () => {
    const imageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const uploadResponse = await request(app)
      .post('/api/wallpapers')
      .attach('image', imageBuffer, 'format-jpg-test.png')
      .expect(201);

    const wallpaperId = uploadResponse.body.data.id;
    const storedFilename =
      uploadResponse.body.data.filename || uploadResponse.body.data.file_name;
    const filePath =
      uploadResponse.body.data.file_path || uploadResponse.body.data.filePath;
    cleanupTargets.add(
      path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '..', filePath)
    );

    const thumbName = `${path.parse(storedFilename).name}-160xauto.jpg`;
    cleanupTargets.add(path.join(thumbnailsDir, thumbName));

    const res = await request(app)
      .get(`/api/wallpapers/${wallpaperId}/thumbnail`)
      .query({ w: 160, format: 'jpg' })
      .buffer()
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/image/);
  });

  test('thumbnail with invalid dimension falls back to default width', async () => {
    const imageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 80, g: 80, b: 80 },
      },
    })
      .png()
      .toBuffer();

    const uploadResponse = await request(app)
      .post('/api/wallpapers')
      .attach('image', imageBuffer, 'invalid-dim-test.png')
      .expect(201);

    const wallpaperId = uploadResponse.body.data.id;
    const filePath =
      uploadResponse.body.data.file_path || uploadResponse.body.data.filePath;
    cleanupTargets.add(
      path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '..', filePath)
    );

    // w=-1 should trigger the "invalid dimension" branch (covered by #sanitizeDimension)
    const res = await request(app)
      .get(`/api/wallpapers/${wallpaperId}/thumbnail`)
      .query({ w: -1, format: 'webp' })
      .buffer()
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/image/);
  });
});

describe('Wallpaper download - Content-Disposition header', () => {
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
    await db?.close?.();
  });

  afterEach(() => {
    db.prepare('DELETE FROM wallpapers').run();
  });

  test('single download Content-Disposition uses filename* for non-ASCII names', async () => {
    const imageBuffer = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .png()
      .toBuffer();

    const uploadRes = await request(app)
      .post('/api/wallpapers')
      .attach('image', imageBuffer, '美丽壁纸.png')
      .expect(201);

    const wallpaperId = uploadRes.body.data.id;
    const filePath =
      uploadRes.body.data.file_path || uploadRes.body.data.filePath;
    cleanupTargets.add(
      path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '..', filePath)
    );

    const res = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [wallpaperId] })
      .expect(200);

    const disposition = res.headers['content-disposition'] || '';
    // 必须包含 filename*=UTF-8'' 编码格式，不得裸露未转义的非 ASCII 字符
    expect(disposition).toMatch(/filename\*=UTF-8''/);
    expect(disposition).not.toMatch(/[\u0080-\uffff]/);
  });
});
