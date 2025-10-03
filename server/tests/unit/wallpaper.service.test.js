/* eslint-env jest */
import { WallpaperService } from '../../src/services/wallpaper.service.js';
import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';

describe('WallpaperService#getRandomWallpaper', () => {
  let db;
  let service;

  beforeAll(async () => {
    db = await createTestDatabase();
    service = new WallpaperService(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM wallpapers').run();
    db.prepare('DELETE FROM wallpaper_groups WHERE is_default = 0').run();
    db.prepare(
      'UPDATE wallpaper_groups SET is_current = CASE WHEN is_default = 1 THEN 1 ELSE 0 END'
    ).run();
  });

  const insertGroup = (name, { isDefault = 0, isCurrent = 0 } = {}) => {
    const stmt = db.prepare(
      'INSERT INTO wallpaper_groups (name, is_default, is_current) VALUES (?, ?, ?)'
    );
    return stmt.run(name, isDefault, isCurrent).lastInsertRowid;
  };

  const insertWallpaper = ({
    groupId = null,
    name = '测试壁纸',
    filename = 'test-wall.jpg',
  } = {}) => {
    const stmt = db.prepare(`
      INSERT INTO wallpapers (filename, original_name, file_path, file_size, mime_type, group_id, name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      filename,
      `${name}.jpg`,
      `uploads/wallpapers/${filename}`,
      1024,
      'image/jpeg',
      groupId,
      name
    );
    return db
      .prepare('SELECT * FROM wallpapers WHERE id = ?')
      .get(result.lastInsertRowid);
  };

  test('returns wallpaper from the requested group when available', () => {
    const groupId = insertGroup('自定义组');
    const wallpaper = insertWallpaper({ groupId, filename: 'group-wall.jpg' });

    const result = service.getRandomWallpaper(groupId);

    expect(result).toBeDefined();
    expect(result.id).toBe(wallpaper.id);
    expect(result.group_id).toBe(groupId);

    const activeRow = db
      .prepare('SELECT is_active FROM wallpapers WHERE id = ?')
      .get(result.id);
    expect(activeRow.is_active).toBe(1);
  });

  test('falls back to any wallpaper when requested group has none', () => {
    const globalWallpaper = insertWallpaper({
      groupId: null,
      filename: 'global-wall.jpg',
      name: '全局壁纸',
    });
    const emptyGroupId = insertGroup('空组');

    const result = service.getRandomWallpaper(emptyGroupId);

    expect(result).toBeDefined();
    expect(result.id).toBe(globalWallpaper.id);
    expect(result.group_id).toBeNull();
  });

  test('uses global collection when no current group wallpaper exists', () => {
    insertWallpaper({ filename: 'global-only.jpg', name: '唯一壁纸' });
    // 取消当前分组标记以模拟没有有效分组
    db.prepare('UPDATE wallpaper_groups SET is_current = 0').run();

    const result = service.getRandomWallpaper(null);

    expect(result).toBeDefined();
    expect(result.group_id).toBeNull();
  });
});
