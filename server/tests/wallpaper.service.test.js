/* eslint-env jest */
import { initDatabase } from '../src/config/database.js';
import { WallpaperService } from '../src/services/wallpaper.service.js';

let db;
let service;

beforeAll(async () => {
  // Use in-memory sqlite for tests
  process.env.DB_PATH = ':memory:';
  db = await initDatabase();
  service = new WallpaperService(db);
});

afterAll(() => {
  try {
    db.close();
  } catch (error) {
    // ignore close errors in teardown
    void error;
  }
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
