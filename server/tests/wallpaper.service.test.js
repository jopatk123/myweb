/* eslint-env jest */
import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTestDatabase, closeTestDatabase } from './helpers/test-db.js';
import { WallpaperService } from '../src/services/wallpaper.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, 'tmp-wallpapers');

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
  await fs.writeFile(filePathOnDisk, 'fake image data');

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
  const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
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
    await fs.writeFile(payload.filePath, 'fake data');
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
  expect(consoleSpy).toHaveBeenCalledTimes(1);

  unlinkSpy.mockRestore();
  consoleSpy.mockRestore();
});
