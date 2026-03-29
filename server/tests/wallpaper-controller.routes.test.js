import { jest } from '@jest/globals';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createApp } from '../src/appFactory.js';
import { WALLPAPERS_DIR } from '../src/utils/upload-path.js';
import { WallpaperService } from '../src/services/wallpaper.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;
let db;

beforeAll(async () => {
  ({ app, db } = await createApp({
    dbPath: ':memory:',
    seedBuiltinApps: false,
    silentDbLogs: true,
  }));
});

afterAll(async () => {
  await db?.close?.();
});

beforeEach(() => {
  db.prepare('DELETE FROM wallpapers').run();
  db.prepare('DELETE FROM wallpaper_groups WHERE is_default = 0').run();
  jest.restoreAllMocks();
});

function insertWallpaper(overrides = {}) {
  const now = Date.now();
  const filename = overrides.filename || `wall-${now}.jpg`;
  const stmt = db.prepare(`
    INSERT INTO wallpapers (filename, original_name, file_path, file_size, mime_type, group_id, name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const res = stmt.run(
    filename,
    overrides.originalName || filename,
    overrides.filePath || `uploads/wallpapers/${filename}`,
    overrides.fileSize || 1024,
    overrides.mimeType || 'image/jpeg',
    overrides.groupId || null,
    overrides.name || '测试壁纸'
  );
  return Number(res.lastInsertRowid);
}

describe('WallpaperController - getWallpapers()', () => {
  test('GET /api/wallpapers returns list', async () => {
    insertWallpaper();
    const res = await request(app).get('/api/wallpapers').expect(200);
    expect(res.body.code).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/wallpapers with pagination returns paged result', async () => {
    insertWallpaper();
    insertWallpaper();
    const res = await request(app)
      .get('/api/wallpapers?page=1&limit=1')
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
  });
});

describe('WallpaperController - getWallpaper()', () => {
  test('GET /api/wallpapers/:id returns wallpaper', async () => {
    const id = insertWallpaper({ name: '单个壁纸' });
    const res = await request(app).get(`/api/wallpapers/${id}`).expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  test('returns 404 for non-existent wallpaper', async () => {
    const res = await request(app).get('/api/wallpapers/999999').expect(404);
    expect(res.body.code).toBe(404);
  });
});

describe('WallpaperController - updateWallpaper()', () => {
  test('PUT /api/wallpapers/:id updates wallpaper name', async () => {
    const id = insertWallpaper({ name: '旧壁纸名' });
    const res = await request(app)
      .put(`/api/wallpapers/${id}`)
      .send({ name: '新壁纸名' })
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.name).toBe('新壁纸名');
  });

  test('PUT /api/wallpapers/:id returns 500 when service throws', async () => {
    const id = insertWallpaper({ name: '更新失败壁纸' });
    jest
      .spyOn(WallpaperService.prototype, 'updateWallpaper')
      .mockRejectedValueOnce(new Error('update failed'));

    const res = await request(app)
      .put(`/api/wallpapers/${id}`)
      .send({ name: '不会成功' })
      .expect(500);

    expect(res.body.code).toBe(500);
  });
});

describe('WallpaperController - deleteWallpaper()', () => {
  test('DELETE /api/wallpapers/:id deletes wallpaper', async () => {
    const id = insertWallpaper();
    const res = await request(app).delete(`/api/wallpapers/${id}`).expect(200);
    expect(res.body.code).toBe(200);
  });

  test('DELETE /api/wallpapers/:id returns 500 when service throws', async () => {
    const id = insertWallpaper({ name: '删除失败壁纸' });
    jest
      .spyOn(WallpaperService.prototype, 'deleteWallpaper')
      .mockRejectedValueOnce(new Error('delete failed'));

    const res = await request(app).delete(`/api/wallpapers/${id}`).expect(500);

    expect(res.body.code).toBe(500);
  });
});

describe('WallpaperController - deleteWallpapers()', () => {
  test('DELETE /api/wallpapers batch deletes wallpapers', async () => {
    const id1 = insertWallpaper({ name: '批删1' });
    const id2 = insertWallpaper({ name: '批删2' });
    const res = await request(app)
      .delete('/api/wallpapers')
      .send({ ids: [id1, id2] })
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('returns 400 when ids is empty', async () => {
    const res = await request(app)
      .delete('/api/wallpapers')
      .send({ ids: [] })
      .expect(400);
    expect(res.body.code).toBe(400);
  });

  test('returns 400 when ids are invalid values', async () => {
    const res = await request(app)
      .delete('/api/wallpapers')
      .send({ ids: [-1, 0, 'abc'] })
      .expect(400);
    expect(res.body.code).toBe(400);
  });
});

describe('WallpaperController - moveWallpapers()', () => {
  test('PUT /api/wallpapers/move moves wallpapers to group', async () => {
    const id = insertWallpaper({ name: '移动壁纸' });
    const groupRow = db
      .prepare('SELECT id FROM wallpaper_groups WHERE is_default = 1')
      .get();
    const res = await request(app)
      .put('/api/wallpapers/move')
      .send({ ids: [id], groupId: groupRow ? groupRow.id : null })
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('returns 400 when ids is empty', async () => {
    const res = await request(app)
      .put('/api/wallpapers/move')
      .send({ ids: [], groupId: 1 })
      .expect(400);
    expect(res.body.code).toBe(400);
  });

  test('returns 400 when groupId is missing', async () => {
    const id = insertWallpaper({ name: '无分组ID' });
    const res = await request(app)
      .put('/api/wallpapers/move')
      .send({ ids: [id] })
      .expect(400);
    expect(res.body.code).toBe(400);
  });
});

describe('WallpaperController - setActiveWallpaper()', () => {
  test('PUT /api/wallpapers/:id/active sets wallpaper as active', async () => {
    const id = insertWallpaper({ name: '活跃壁纸' });
    const res = await request(app)
      .put(`/api/wallpapers/${id}/active`)
      .expect(200);
    expect(res.body.code).toBe(200);
  });
});

describe('WallpaperController - getActiveWallpaper()', () => {
  test('GET /api/wallpapers/active returns active wallpaper', async () => {
    const res = await request(app).get('/api/wallpapers/active').expect(200);
    expect(res.body.code).toBe(200);
  });
});

describe('WallpaperController - getRandomWallpaper()', () => {
  test('GET /api/wallpapers/random returns a wallpaper or null', async () => {
    const res = await request(app).get('/api/wallpapers/random').expect(200);
    expect(res.body.code).toBe(200);
  });

  test('GET /api/wallpapers/random returns 500 when service throws', async () => {
    jest
      .spyOn(WallpaperService.prototype, 'getRandomWallpaper')
      .mockRejectedValueOnce(new Error('random failed'));

    const res = await request(app).get('/api/wallpapers/random').expect(500);

    expect(res.body.code).toBe(500);
  });
});

describe('WallpaperController - Groups', () => {
  test('GET /api/wallpapers/groups returns all groups', async () => {
    const res = await request(app)
      .get('/api/wallpapers/groups/all')
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/wallpapers/groups creates a group', async () => {
    const res = await request(app)
      .post('/api/wallpapers/groups')
      .send({ name: '新壁纸分组' })
      .expect(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.name).toBe('新壁纸分组');
  });

  test('PUT /api/wallpapers/groups/:id updates a group', async () => {
    const createRes = await request(app)
      .post('/api/wallpapers/groups')
      .send({ name: '待更新壁纸组' });
    const gid = createRes.body.data.id;
    const res = await request(app)
      .put(`/api/wallpapers/groups/${gid}`)
      .send({ name: '已更新壁纸组' })
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('DELETE /api/wallpapers/groups/:id deletes a group', async () => {
    const createRes = await request(app)
      .post('/api/wallpapers/groups')
      .send({ name: '待删壁纸组' });
    const gid = createRes.body.data.id;
    const res = await request(app)
      .delete(`/api/wallpapers/groups/${gid}`)
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('GET /api/wallpapers/groups/current returns current group', async () => {
    const res = await request(app)
      .get('/api/wallpapers/groups/current')
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('PUT /api/wallpapers/groups/:id/current sets current group', async () => {
    const createRes = await request(app)
      .post('/api/wallpapers/groups')
      .send({ name: '当前壁纸组设置' });
    const gid = createRes.body.data.id;
    const res = await request(app)
      .put(`/api/wallpapers/groups/${gid}/current`)
      .expect(200);
    expect(res.body.code).toBe(200);
  });
});

describe('WallpaperController - downloadWallpapers()', () => {
  test('returns 400 when ids is empty', async () => {
    const res = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [] })
      .expect(400);
    expect(res.body.code).toBe(400);
  });

  test('returns 400 when all ids are invalid', async () => {
    const res = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [-1, 0] })
      .expect(400);
    expect(res.body.code).toBe(400);
  });

  test('returns 404 when no wallpapers found', async () => {
    const res = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [999999, 999998] })
      .expect(404);
    expect(res.body.code).toBe(404);
  });

  test('downloads single wallpaper file successfully', async () => {
    const filename = `single-download-${Date.now()}.jpg`;
    const diskPath = path.join(WALLPAPERS_DIR, filename);
    await fs.writeFile(diskPath, Buffer.from('single-image-data'));

    const id = insertWallpaper({
      filename,
      originalName: 'single-download.jpg',
      filePath: `uploads/wallpapers/${filename}`,
      mimeType: 'image/jpeg',
    });

    const res = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [id] })
      .expect(200);

    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.headers['content-disposition']).toContain('single-download.jpg');

    await fs.rm(diskPath, { force: true });
  });

  test('downloads multiple wallpapers as zip', async () => {
    const filename1 = `zip-download-1-${Date.now()}.jpg`;
    const filename2 = `zip-download-2-${Date.now()}.jpg`;
    const diskPath1 = path.join(WALLPAPERS_DIR, filename1);
    const diskPath2 = path.join(WALLPAPERS_DIR, filename2);
    await fs.writeFile(diskPath1, Buffer.from('zip-image-data-1'));
    await fs.writeFile(diskPath2, Buffer.from('zip-image-data-2'));

    const id1 = insertWallpaper({
      filename: filename1,
      originalName: 'zip1.jpg',
      filePath: `uploads/wallpapers/${filename1}`,
      mimeType: 'image/jpeg',
    });
    const id2 = insertWallpaper({
      filename: filename2,
      originalName: 'zip2.jpg',
      filePath: `uploads/wallpapers/${filename2}`,
      mimeType: 'image/jpeg',
    });

    const res = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [id1, id2] })
      .expect(200);

    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('wallpapers_');

    await fs.rm(diskPath1, { force: true });
    await fs.rm(diskPath2, { force: true });
  });

  test('download returns 500 when service throws', async () => {
    jest
      .spyOn(WallpaperService.prototype, 'getWallpapersByIds')
      .mockRejectedValueOnce(new Error('download failed'));

    const res = await request(app)
      .post('/api/wallpapers/download')
      .send({ ids: [1] })
      .expect(500);

    expect(res.body.code).toBe(500);
  });
});

describe('WallpaperController - getWallpaperThumbnail()', () => {
  test('returns error for non-existent wallpaper thumbnail', async () => {
    const res = await request(app)
      .get('/api/wallpapers/999999/thumbnail')
      .expect(404);
    expect(res.body.code).toBe(404);
  });

  test('returns error for wallpaper with null file path', async () => {
    // Insert a wallpaper with null file_path directly into DB
    const stmt = db.prepare(`
      INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
      VALUES (?, ?, ?, NULL, ?, ?)
    `);
    const result = stmt.run(
      '无路径壁纸',
      'nopath.jpg',
      'nopath.jpg',
      0,
      'image/jpeg'
    );
    const id = Number(result.lastInsertRowid);

    const res = await request(app)
      .get(`/api/wallpapers/${id}/thumbnail`)
      .expect(404);
    expect(res.body.code).toBe(404);
  });

  test('returns error when wallpaper file does not exist on disk', async () => {
    // Insert a wallpaper with a valid relative path but no actual file
    const stmt = db.prepare(`
      INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      '虚假路径',
      'ghost.jpg',
      'ghost.jpg',
      'uploads/wallpapers/ghost-nonexistent.jpg',
      0,
      'image/jpeg'
    );
    const id = Number(result.lastInsertRowid);

    const res = await request(app)
      .get(`/api/wallpapers/${id}/thumbnail`)
      .expect(404);
    expect(res.body.code).toBe(404);
  });
});

describe('WallpaperController - Groups error paths', () => {
  test('DELETE non-existent group returns error', async () => {
    const res = await request(app)
      .delete('/api/wallpapers/groups/999999')
      .expect(404);
    expect(res.body.code).toBe(404);
  });

  test('PUT non-existent group returns error', async () => {
    const res = await request(app)
      .put('/api/wallpapers/groups/999999')
      .send({ name: '不存在的分组' })
      .expect(404);
    expect(res.body.code).toBe(404);
  });

  test('PUT /api/wallpapers/groups/:id/current with non-existent group returns error', async () => {
    const res = await request(app)
      .put('/api/wallpapers/groups/999999/current')
      .expect(404);
    expect(res.body.code).toBe(404);
  });

  test('DELETE group with wallpapers returns error', async () => {
    // Create a group
    const createGroupRes = await request(app)
      .post('/api/wallpapers/groups')
      .send({ name: '有壁纸的分组' });
    const gid = createGroupRes.body.data.id;

    // Insert a wallpaper in that group
    db.prepare(
      `
      INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type, group_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      '组内壁纸',
      'ingroup.jpg',
      'ingroup.jpg',
      'uploads/wallpapers/ingroup.jpg',
      100,
      'image/jpeg',
      gid
    );

    // Try to delete the group → should fail
    const res = await request(app).delete(`/api/wallpapers/groups/${gid}`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
