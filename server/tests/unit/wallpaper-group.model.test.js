import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { WallpaperGroupModel } from '../../src/models/wallpaper-group.model.js';

describe('WallpaperGroupModel', () => {
  let db;
  let model;

  beforeAll(async () => {
    db = await createTestDatabase();
    model = new WallpaperGroupModel(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    // 清除非默认分组
    db.prepare('DELETE FROM wallpaper_groups WHERE is_default = 0').run();
  });

  describe('findAll()', () => {
    test('returns only non-deleted groups', () => {
      const g = model.create({ name: '测试分组' });
      const all = model.findAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.some(r => r.id === g.id)).toBe(true);
    });

    test('does not include soft-deleted groups', () => {
      const g = model.create({ name: '软删组' });
      model.delete(g.id);
      const all = model.findAll();
      expect(all.some(r => r.id === g.id)).toBe(false);
    });
  });

  describe('findById()', () => {
    test('returns group by id', () => {
      const g = model.create({ name: '查找分组' });
      const found = model.findById(g.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('查找分组');
    });

    test('returns undefined for non-existent id', () => {
      expect(model.findById(999999)).toBeUndefined();
    });

    test('returns undefined for soft-deleted group', () => {
      const g = model.create({ name: '软删查找' });
      model.delete(g.id);
      expect(model.findById(g.id)).toBeUndefined();
    });
  });

  describe('create()', () => {
    test('creates a new group', () => {
      const g = model.create({ name: '新组' });
      expect(g).toBeDefined();
      expect(g.name).toBe('新组');
    });

    test('restores soft-deleted group with same name', () => {
      const g = model.create({ name: '可恢复组' });
      model.delete(g.id);
      expect(model.findById(g.id)).toBeUndefined();

      const restored = model.create({ name: '可恢复组' });
      expect(restored.id).toBe(g.id);
      expect(restored.deleted_at).toBeNull();
    });

    test('throws 400 when creating duplicate active group', () => {
      model.create({ name: '重复组' });
      expect(() => model.create({ name: '重复组' })).toThrow('分组已存在');
    });
  });

  describe('update()', () => {
    test('updates group name', () => {
      const g = model.create({ name: '旧名称' });
      const updated = model.update(g.id, { name: '新名称' });
      expect(updated.name).toBe('新名称');
    });

    test('updates is_default field', () => {
      const g = model.create({ name: '测试默认' });
      const updated = model.update(g.id, { isDefault: true });
      expect(updated.is_default).toBe(1);
      // 恢复
      model.update(g.id, { isDefault: false });
    });

    test('updates is_current field', () => {
      const g = model.create({ name: '测试当前' });
      const updated = model.update(g.id, { isCurrent: true });
      expect(updated.is_current).toBe(1);
    });

    test('returns current row when no valid fields provided', () => {
      const g = model.create({ name: '空更新' });
      const result = model.update(g.id, {});
      expect(result.id).toBe(g.id);
    });

    test('ignores unknown fields', () => {
      const g = model.create({ name: '未知字段' });
      const result = model.update(g.id, { unknownField: 'value' });
      expect(result.id).toBe(g.id);
    });
  });

  describe('delete()', () => {
    test('soft-deletes a non-default group', () => {
      const g = model.create({ name: '待删除组' });
      model.delete(g.id);
      expect(model.findById(g.id)).toBeUndefined();
    });

    test('throws when trying to delete default group', () => {
      const defaultGroup = model.getDefault();
      if (!defaultGroup) return;
      expect(() => model.delete(defaultGroup.id)).toThrow('不能删除默认分组');
    });
  });

  describe('getDefault()', () => {
    test('returns the default group', () => {
      const def = model.getDefault();
      expect(def).toBeDefined();
      expect(def.is_default).toBe(1);
    });
  });

  describe('getCurrent()', () => {
    test('returns the current group or null', () => {
      const current = model.getCurrent();
      // Could be null or a group
      if (current !== null && current !== undefined) {
        expect(current.is_current).toBe(1);
      } else {
        expect(current).toBeFalsy();
      }
    });
  });

  describe('setCurrent()', () => {
    test('sets a group as current and clears others', () => {
      const g = model.create({ name: '当前组' });
      const g2 = model.create({ name: '当前组2' });

      model.setCurrent(g.id);
      let found = model.findById(g.id);
      expect(found.is_current).toBe(1);

      model.setCurrent(g2.id);
      found = model.findById(g.id);
      expect(found.is_current).toBe(0);

      const curr = model.getCurrent();
      expect(curr).toBeDefined();
      expect(curr.id).toBe(g2.id);
    });
  });
});
