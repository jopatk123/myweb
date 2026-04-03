import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { WallpaperModel } from '../../src/models/wallpaper.model.js';

describe('WallpaperModel', () => {
  let db;
  let model;

  beforeAll(async () => {
    db = await createTestDatabase();
    model = new WallpaperModel(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM wallpapers').run();
  });

  const insertWallpaper = (overrides = {}) => {
    return model.create({
      filename: overrides.filename || 'test.jpg',
      original_name:
        overrides.original_name || overrides.originalName || 'original.jpg',
      file_path:
        overrides.file_path ||
        overrides.filePath ||
        'uploads/wallpapers/test.jpg',
      file_size: overrides.file_size || overrides.fileSize || 1024,
      mime_type: overrides.mime_type || overrides.mimeType || 'image/jpeg',
      group_id: overrides.group_id || overrides.groupId || null,
      name: overrides.name || '测试壁纸',
    });
  };

  describe('create()', () => {
    test('creates a wallpaper with snake_case fields (direct model call)', () => {
      const w = insertWallpaper();
      expect(w).toBeDefined();
      expect(w.filename).toBe('test.jpg');
      expect(w.original_name).toBe('original.jpg');
      expect(w.file_size).toBe(1024);
    });

    test('creates a wallpaper with snake_case fields', () => {
      const w = model.create({
        filename: 'snake.jpg',
        original_name: 'orig-snake.jpg',
        file_path: 'uploads/wallpapers/snake.jpg',
        file_size: 2048,
        mime_type: 'image/jpeg',
        name: 'Snake Case Wallpaper',
      });
      expect(w).toBeDefined();
      expect(w.original_name).toBe('orig-snake.jpg');
    });
  });

  describe('findAll()', () => {
    test('returns all non-deleted wallpapers', () => {
      insertWallpaper({ filename: 'a.jpg' });
      insertWallpaper({ filename: 'b.jpg' });
      const all = model.findAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(2);
    });

    test('filters by groupId', () => {
      const groupRow = db
        .prepare('SELECT id FROM wallpaper_groups WHERE is_default = 1 LIMIT 1')
        .get();
      const gid = groupRow ? groupRow.id : null;

      insertWallpaper({ filename: 'c.jpg', groupId: gid });
      insertWallpaper({ filename: 'd.jpg', groupId: null });

      if (gid) {
        const filtered = model.findAll({ groupId: gid });
        expect(filtered.every(w => w.group_id === gid)).toBe(true);
      }
    });

    test('filters by activeOnly', () => {
      const w = insertWallpaper({ filename: 'active-only.jpg' });
      model.setActive(w.id);
      const active = model.findAll({ activeOnly: true });
      expect(active.length).toBe(1);
      expect(active[0].is_active).toBe(1);
    });

    test('returns paginated result when page and limit are provided', () => {
      insertWallpaper({ filename: 'p1.jpg' });
      insertWallpaper({ filename: 'p2.jpg' });
      insertWallpaper({ filename: 'p3.jpg' });
      const result = model.findAll({ page: 1, limit: 2 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('findById()', () => {
    test('returns wallpaper by id', () => {
      const w = insertWallpaper();
      const found = model.findById(w.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(w.id);
    });

    test('returns undefined for non-existent id', () => {
      expect(model.findById(999999)).toBeUndefined();
    });

    test('returns undefined for soft-deleted wallpaper', () => {
      const w = insertWallpaper({ filename: 'del.jpg' });
      model.delete(w.id);
      expect(model.findById(w.id)).toBeUndefined();
    });
  });

  describe('findManyByIds()', () => {
    test('returns multiple wallpapers by ids', () => {
      const w1 = insertWallpaper({ filename: 'multi1.jpg' });
      const w2 = insertWallpaper({ filename: 'multi2.jpg' });
      const results = model.findManyByIds([w1.id, w2.id]);
      expect(results.length).toBe(2);
    });

    test('returns empty array for empty ids input', () => {
      expect(model.findManyByIds([])).toEqual([]);
    });

    test('returns empty array for null ids input', () => {
      expect(model.findManyByIds(null)).toEqual([]);
    });
  });

  describe('update()', () => {
    test('updates wallpaper fields', () => {
      const w = insertWallpaper({ filename: 'upd.jpg' });
      const updated = model.update(w.id, { name: '新名称' });
      expect(updated.name).toBe('新名称');
    });

    test('updates is_active as boolean', () => {
      const w = insertWallpaper({ filename: 'active-upd.jpg' });
      const updated = model.update(w.id, { is_active: true });
      expect(updated.is_active).toBe(1);
    });

    test('returns current row when no valid fields provided', () => {
      const w = insertWallpaper({ filename: 'no-upd.jpg' });
      const result = model.update(w.id, {});
      expect(result.id).toBe(w.id);
    });

    test('ignores unknown fields', () => {
      const w = insertWallpaper({ filename: 'unk-field.jpg' });
      const result = model.update(w.id, { unknownField: 'value' });
      expect(result.id).toBe(w.id);
    });
  });

  describe('delete()', () => {
    test('soft deletes by setting deleted_at', () => {
      const w = insertWallpaper({ filename: 'del-me.jpg' });
      const info = model.delete(w.id);
      expect(info.changes).toBe(1);
      expect(model.findById(w.id)).toBeUndefined();
    });
  });

  describe('deleteMany()', () => {
    test('soft deletes multiple wallpapers', () => {
      const w1 = insertWallpaper({ filename: 'dm1.jpg' });
      const w2 = insertWallpaper({ filename: 'dm2.jpg' });
      const info = model.deleteMany([w1.id, w2.id]);
      expect(info.changes).toBe(2);
    });

    test('returns null for empty ids', () => {
      expect(model.deleteMany([])).toBeNull();
    });

    test('returns null for null ids', () => {
      expect(model.deleteMany(null)).toBeNull();
    });
  });

  describe('moveMany()', () => {
    test('moves wallpapers to another group', () => {
      const w1 = insertWallpaper({ filename: 'mv1.jpg' });
      const w2 = insertWallpaper({ filename: 'mv2.jpg' });
      const groupRow = db
        .prepare('SELECT id FROM wallpaper_groups LIMIT 1')
        .get();
      if (!groupRow) return;
      model.moveMany([w1.id, w2.id], groupRow.id);
      const moved = model.findById(w1.id);
      expect(moved.group_id).toBe(groupRow.id);
    });

    test('returns null for empty ids', () => {
      expect(model.moveMany([], 1)).toBeNull();
    });

    test('returns null for null ids', () => {
      expect(model.moveMany(null, 1)).toBeNull();
    });
  });

  describe('setActive()', () => {
    test('sets one wallpaper as active and deactivates others', () => {
      const w1 = insertWallpaper({ filename: 'sa1.jpg' });
      const w2 = insertWallpaper({ filename: 'sa2.jpg' });
      model.setActive(w1.id);
      model.setActive(w2.id);
      const activeRow = db
        .prepare(
          'SELECT COUNT(*) as cnt FROM wallpapers WHERE is_active = 1 AND deleted_at IS NULL'
        )
        .get();
      expect(activeRow.cnt).toBe(1);
    });
  });

  describe('getActive()', () => {
    test('returns the active wallpaper', () => {
      const w = insertWallpaper({ filename: 'get-active.jpg' });
      model.setActive(w.id);
      const active = model.getActive();
      expect(active).toBeDefined();
      expect(active.is_active).toBe(1);
    });

    test('returns undefined when no active wallpaper', () => {
      // 清除所有活跃标记
      db.prepare('UPDATE wallpapers SET is_active = 0').run();
      const active = model.getActive();
      expect(active).toBeFalsy();
    });
  });

  describe('getRandomByGroup()', () => {
    test('returns a random wallpaper from a group', () => {
      const groupRow = db
        .prepare('SELECT id FROM wallpaper_groups LIMIT 1')
        .get();
      if (!groupRow) return;
      insertWallpaper({ filename: 'rg1.jpg', groupId: groupRow.id });
      const result = model.getRandomByGroup(groupRow.id);
      expect(result).toBeDefined();
      expect(result.group_id).toBe(groupRow.id);
    });

    test('returns a random wallpaper when groupId is null', () => {
      insertWallpaper({ filename: 'rg-null.jpg' });
      const result = model.getRandomByGroup(null);
      expect(result).toBeDefined();
    });

    test('returns a random wallpaper when groupId is undefined', () => {
      insertWallpaper({ filename: 'rg-undef.jpg' });
      const result = model.getRandomByGroup(undefined);
      expect(result).toBeDefined();
    });
  });
});
