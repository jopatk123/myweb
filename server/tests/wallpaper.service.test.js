import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { createTestDatabase, closeTestDatabase } from './helpers/test-db.js';
import { WallpaperService } from '../src/services/wallpaper.service.js';
import { WALLPAPERS_DIR } from '../src/utils/upload-path.js';

/** 最小有效 PNG 文件头（8 字节魔数 + IHDR chunk 填充） */
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52,
]);

const tempDir = path.join(WALLPAPERS_DIR, 'tmp-wallpapers');

let db;
let service;

beforeAll(async () => {
  // Use in-memory sqlite for tests
  db = await createTestDatabase();
  service = new WallpaperService(db);
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
});

afterAll(() => {
  closeTestDatabase(db);
});

afterEach(async () => {
  db.prepare('DELETE FROM wallpapers').run();
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
  jest.restoreAllMocks();
});

test('uploadWallpaper accepts camelCase payload and stores snake_case columns', async () => {
  const fileData = {
    filename: 'test1.jpg',
    originalName: 'orig1.jpg',
    filePath: 'uploads/wallpapers/test1.jpg',
    fileSize: 1024,
    mimeType: 'image/jpeg',
    name: 'Test One',
  };

  const group = (await db
    .prepare('SELECT id FROM wallpaper_groups LIMIT 1')
    .get()) || { id: null };
  const groupId = group.id || null;

  const row = await service.uploadWallpaper(fileData, groupId);
  expect(row).toBeDefined();
  expect(row.original_name).toBe('orig1.jpg');
  expect(row.file_path).toBe('uploads/wallpapers/test1.jpg');
  expect(Number(row.file_size)).toBe(1024);
  if (groupId !== null) expect(Number(row.group_id)).toBe(Number(groupId));
});

test('getWallpaperById throws 404 error when wallpaper does not exist', () => {
  expect(() => service.getWallpaperById(9999)).toThrow('壁纸不存在');
  try {
    service.getWallpaperById(9999);
  } catch (error) {
    expect(error.status).toBe(404);
  }
});

test('uploadWallpaper rejects non-image mime types and preserves error', async () => {
  const payload = {
    filename: 'test.txt',
    originalName: 'test.txt',
    filePath: 'uploads/wallpapers/test.txt',
    fileSize: 10,
    mimeType: 'text/plain',
    name: 'bad file',
  };

  await expect(service.uploadWallpaper(payload)).rejects.toThrow(
    '只支持图片文件'
  );
});

test('deleteWallpaper removes db record and deletes physical file', async () => {
  const filePathOnDisk = path.join(tempDir, 'delete-me.png');
  await fs.writeFile(filePathOnDisk, MINIMAL_PNG);

  const created = await service.uploadWallpaper({
    filename: 'delete-me.png',
    originalName: 'delete-me.png',
    filePath: filePathOnDisk,
    fileSize: 123,
    mimeType: 'image/png',
    name: 'To delete',
  });

  const dbResult = await service.deleteWallpaper(created.id);
  expect(dbResult.changes).toBe(1);
  await expect(fs.access(filePathOnDisk)).rejects.toThrow();
  expect(service.wallpaperModel.findById(created.id)).toBeUndefined();
});

test('deleteMultipleWallpapers attempts to cleanup files and returns changes count', async () => {
  const unlinkSpy = jest
    .spyOn(fs, 'unlink')
    .mockRejectedValueOnce(
      Object.assign(new Error('EACCES'), { code: 'EACCES' })
    )
    .mockResolvedValue();

  const payloads = [1, 2].map(index => ({
    filename: `multi-${index}.png`,
    originalName: `multi-${index}.png`,
    filePath: path.join(tempDir, `multi-${index}.png`),
    fileSize: 256,
    mimeType: 'image/png',
    name: `multi ${index}`,
  }));

  for (const payload of payloads) {
    await fs.writeFile(payload.filePath, MINIMAL_PNG);
  }

  const items = [];
  for (const payload of payloads) {
    const record = await service.uploadWallpaper(payload);
    items.push(record);
  }

  const result = await service.deleteMultipleWallpapers(
    items.map(item => item.id)
  );
  expect(result.changes).toBeGreaterThanOrEqual(2);
  expect(unlinkSpy).toHaveBeenCalledTimes(2);

  unlinkSpy.mockRestore();
});

test('deleteWallpaper skips file deletion when file_path is null', async () => {
  // Insert a wallpaper with null file_path directly
  const row = db
    .prepare(
      `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
    VALUES ('nullpath', 'nullpath.jpg', 'nullpath.jpg', NULL, 0, 'image/jpeg')
  `
    )
    .run();
  const id = Number(row.lastInsertRowid);

  // Should not throw even though file_path is null
  const result = await service.deleteWallpaper(id);
  expect(result).toBeDefined();
  expect(service.wallpaperModel.findById(id)).toBeUndefined();
});

test('deleteGroup throws when group has wallpapers', async () => {
  // Create a group
  const group = service.createGroup({ name: '有壁纸测试分组' });

  // Insert a wallpaper in the group
  db.prepare(
    `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type, group_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    'in-group',
    'ingroup.jpg',
    'ingroup.jpg',
    'uploads/wallpapers/ingroup.jpg',
    100,
    'image/jpeg',
    group.id
  );

  // Should throw
  await expect(async () => service.deleteGroup(group.id)).rejects.toThrow(
    '分组下还有壁纸'
  );
});

test('updateGroup throws when group does not exist', () => {
  expect(() => service.updateGroup(999999, { name: '不存在' })).toThrow(
    '分组不存在'
  );
});

test('deleteGroup throws when group does not exist', () => {
  expect(() => service.deleteGroup(999999)).toThrow('分组不存在');
});

test('setCurrentGroup throws when group does not exist', () => {
  expect(() => service.setCurrentGroup(999999)).toThrow('分组不存在');
});

test('getWallpaperThumbnail throws when wallpaper path is null', async () => {
  // Insert a wallpaper with null file_path
  const row = db
    .prepare(
      `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
    VALUES ('nullthumb', 'nullthumb.jpg', 'nullthumb.jpg', NULL, 0, 'image/jpeg')
  `
    )
    .run();
  const id = Number(row.lastInsertRowid);

  await expect(service.getWallpaperThumbnail(id, {})).rejects.toMatchObject({
    status: 404,
  });
});

test('getWallpaperThumbnail throws when file does not exist on disk', async () => {
  const created = await service.uploadWallpaper({
    filename: 'ghost-thumb.jpg',
    originalName: 'ghost-thumb.jpg',
    filePath: 'uploads/wallpapers/ghost-completely-missing.jpg',
    fileSize: 100,
    mimeType: 'image/jpeg',
    name: 'Ghost',
  });

  await expect(
    service.getWallpaperThumbnail(created.id, {})
  ).rejects.toMatchObject({ status: 404 });
});

test('uploadWallpaper cleans up disk file when model create fails', async () => {
  const createSpy = jest
    .spyOn(service.wallpaperModel, 'create')
    .mockImplementation(() => {
      throw new Error('db insert failed');
    });
  const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue();

  await expect(
    service.uploadWallpaper({
      filename: 'failed-create.jpg',
      originalName: 'failed-create.jpg',
      filePath: 'uploads/wallpapers/failed-create.jpg',
      fileSize: 11,
      mimeType: 'image/jpeg',
      name: 'failed-create',
    })
  ).rejects.toThrow('db insert failed');

  expect(createSpy).toHaveBeenCalled();
  expect(unlinkSpy).toHaveBeenCalled();
});

test('uploadWallpaper ignores cleanup ENOENT and warns on other cleanup errors', async () => {
  jest.spyOn(service.wallpaperModel, 'create').mockImplementation(() => {
    throw new Error('db create error');
  });
  const unlinkSpy = jest
    .spyOn(fs, 'unlink')
    .mockRejectedValueOnce(
      Object.assign(new Error('permission denied'), { code: 'EACCES' })
    );

  await expect(
    service.uploadWallpaper({
      filename: 'cleanup-warn.jpg',
      originalName: 'cleanup-warn.jpg',
      filePath: 'uploads/wallpapers/cleanup-warn.jpg',
      fileSize: 22,
      mimeType: 'image/jpeg',
      name: 'cleanup-warn',
    })
  ).rejects.toThrow('db create error');

  expect(unlinkSpy).toHaveBeenCalled();
});

test('deleteWallpaper ignores non-ENOENT unlink error', async () => {
  const row = db
    .prepare(
      `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
    VALUES ('unlink-error', 'unlink-error.jpg', 'unlink-error.jpg', 'uploads/wallpapers/unlink-error.jpg', 1, 'image/jpeg')
  `
    )
    .run();
  const id = Number(row.lastInsertRowid);

  const unlinkSpy = jest
    .spyOn(fs, 'unlink')
    .mockRejectedValueOnce(Object.assign(new Error('busy'), { code: 'EBUSY' }));

  const result = await service.deleteWallpaper(id);
  expect(result).toBeDefined();
  expect(unlinkSpy).toHaveBeenCalled();
});

test('deleteMultipleWallpapers handles invalid absolute path entries', async () => {
  const row = db
    .prepare(
      `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
    VALUES ('invalid-path', 'invalid-path.jpg', 'invalid-path.jpg', '/etc/passwd', 1, 'image/jpeg')
  `
    )
    .run();
  const id = Number(row.lastInsertRowid);

  const result = await service.deleteMultipleWallpapers([id]);
  expect(result).toBeDefined();
});

test('getWallpaperThumbnail returns 400 when file path is outside uploads root', async () => {
  const row = db
    .prepare(
      `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
    VALUES ('outside-path', 'outside.jpg', 'outside.jpg', '/etc/passwd', 1, 'image/jpeg')
  `
    )
    .run();
  const id = Number(row.lastInsertRowid);

  await expect(service.getWallpaperThumbnail(id, {})).rejects.toMatchObject({
    status: 400,
  });
});

test('getWallpaperThumbnail supports png and unsupported format fallback', async () => {
  const srcPath = path.join(tempDir, 'thumb-source.png');
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zk4QAAAAASUVORK5CYII=',
    'base64'
  );
  await fs.writeFile(srcPath, tinyPng);

  const created = await service.uploadWallpaper({
    filename: 'thumb-source.png',
    originalName: 'thumb-source.png',
    filePath: srcPath,
    fileSize: tinyPng.length,
    mimeType: 'image/png',
    name: 'thumb-source',
  });

  const pngThumb = await service.getWallpaperThumbnail(created.id, {
    width: 32,
    format: 'png',
  });
  expect(pngThumb.mimeType).toBe('image/png');

  const fallbackThumb = await service.getWallpaperThumbnail(created.id, {
    width: 32,
    format: 'tiff',
  });
  expect(fallbackThumb.mimeType).toBe('image/webp');
});

test('deleteWallpaper handles thumbnail cache read/unlink errors', async () => {
  const row = db
    .prepare(
      `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
    VALUES ('purge-errors', 'purge-errors.jpg', 'purge-errors.jpg', 'uploads/wallpapers/purge-errors.jpg', 1, 'image/jpeg')
  `
    )
    .run();
  const id = Number(row.lastInsertRowid);

  const readdirSpy = jest
    .spyOn(fs, 'readdir')
    .mockRejectedValueOnce(
      Object.assign(new Error('dir access denied'), { code: 'EACCES' })
    )
    .mockResolvedValueOnce(['purge-errors-100xauto.webp']);

  const unlinkSpy = jest
    .spyOn(fs, 'unlink')
    .mockResolvedValueOnce()
    .mockRejectedValueOnce(
      Object.assign(new Error('cannot delete cache'), { code: 'EACCES' })
    );

  await service.deleteWallpaper(id);

  const row2 = db
    .prepare(
      `
    INSERT INTO wallpapers (name, filename, original_name, file_path, file_size, mime_type)
    VALUES ('purge-errors-2', 'purge-errors-2.jpg', 'purge-errors-2.jpg', 'uploads/wallpapers/purge-errors.jpg', 1, 'image/jpeg')
  `
    )
    .run();
  await service.deleteWallpaper(Number(row2.lastInsertRowid));

  expect(readdirSpy).toHaveBeenCalled();
  expect(unlinkSpy).toHaveBeenCalled();
});
