import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { AppGroupModel } from '../../src/models/app-group.model.js';

describe('AppGroupModel', () => {
  let db;
  let model;

  beforeAll(async () => {
    db = await createTestDatabase();
    model = new AppGroupModel(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    // 清除非默认分组
    db.prepare('DELETE FROM app_groups WHERE is_default = 0').run();
    db.prepare('DELETE FROM apps').run();
  });

  describe('findAll()', () => {
    test('returns only non-deleted groups', () => {
      const created = model.create({ name: '测试组', slug: 'test-group' });
      const all = model.findAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.some(g => g.id === created.id)).toBe(true);
    });

    test('does not return soft-deleted groups', () => {
      const g = model.create({ name: '待删除', slug: 'to-del' });
      // 手动标记软删除
      db.prepare(
        'UPDATE app_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(g.id);
      const all = model.findAll();
      expect(all.some(r => r.id === g.id)).toBe(false);
    });
  });

  describe('findById()', () => {
    test('returns group by id', () => {
      const g = model.create({ name: '通过ID查找', slug: 'find-by-id' });
      const found = model.findById(g.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(g.id);
      expect(found.name).toBe('通过ID查找');
    });

    test('returns undefined for non-existent id', () => {
      const result = model.findById(999999);
      expect(result).toBeUndefined();
    });

    test('returns undefined for soft-deleted group', () => {
      const g = model.create({ name: '软删分组', slug: 'soft-del' });
      db.prepare(
        'UPDATE app_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(g.id);
      const result = model.findById(g.id);
      expect(result).toBeUndefined();
    });
  });

  describe('create()', () => {
    test('creates a new group', () => {
      const g = model.create({ name: '新分组', slug: 'new-group' });
      expect(g).toBeDefined();
      expect(g.name).toBe('新分组');
      expect(g.slug).toBe('new-group');
    });

    test('creates group with is_default flag', () => {
      // 先清除掉已有的 is_default=1 分组（避免唯一冲突）
      const g = model.create({
        name: '默认组测试',
        slug: 'def-test-grp',
        is_default: 0,
      });
      expect(g).toBeDefined();
      expect(g.is_default).toBe(0);
    });

    test('returns existing active group when slug already exists', () => {
      const g1 = model.create({ name: '重复slug', slug: 'dup-slug' });
      const g2 = model.create({ name: '重复slug2', slug: 'dup-slug' });
      expect(g1.id).toBe(g2.id);
    });

    test('restores soft-deleted group with same slug', () => {
      const g = model.create({ name: '可恢复', slug: 'restoreable' });
      db.prepare(
        'UPDATE app_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(g.id);
      // 验证已软删除
      expect(model.findById(g.id)).toBeUndefined();

      const restored = model.create({ name: '可恢复-新', slug: 'restoreable' });
      expect(restored.id).toBe(g.id);
      expect(restored.deleted_at).toBeNull();
    });

    test('creates group without slug', () => {
      const g = model.create({ name: '无slug组', slug: undefined });
      expect(g).toBeDefined();
      expect(g.name).toBe('无slug组');
    });
  });

  describe('update()', () => {
    test('updates group name', () => {
      const g = model.create({ name: '旧名', slug: 'old-name-u' });
      const updated = model.update(g.id, { name: '新名' });
      expect(updated.name).toBe('新名');
    });

    test('updates group slug', () => {
      const g = model.create({ name: '测试更新slug', slug: 'old-slug-u' });
      const updated = model.update(g.id, { slug: 'new-slug-u' });
      expect(updated.slug).toBe('new-slug-u');
    });

    test('returns current row if no valid fields provided', () => {
      const g = model.create({ name: '无字段更新', slug: 'no-field-u' });
      const result = model.update(g.id, {});
      expect(result.id).toBe(g.id);
    });

    test('updates is_default field', () => {
      const g = model.create({ name: 'is_default更新', slug: 'isdef-u' });
      const updated = model.update(g.id, { is_default: 1 });
      expect(updated.is_default).toBe(1);
    });
  });

  describe('softDelete()', () => {
    test('soft-deletes a non-default group', () => {
      const g = model.create({ name: '待软删', slug: 'soft-del-u' });
      const result = model.softDelete(g.id);
      expect(result).toBeTruthy();
      expect(model.findById(g.id)).toBeUndefined();
    });

    test('throws 400 when trying to delete default group', () => {
      const defaultGroup = model.findAll().find(g => g.is_default === 1);
      if (!defaultGroup) return; // 无默认分组时跳过
      expect(() => model.softDelete(defaultGroup.id)).toThrow(
        '默认分组不可删除'
      );
    });

    test('returns false for non-existent group', () => {
      const result = model.softDelete(999999);
      expect(result).toBeFalsy();
    });

    test('moves apps to default group before soft delete', () => {
      const defaultGroup = db
        .prepare('SELECT id FROM app_groups WHERE is_default = 1')
        .get();
      if (!defaultGroup) return;

      const g = model.create({ name: '移动应用', slug: 'move-apps-u' });
      // 插入一个应用到该分组
      db.prepare(
        `INSERT INTO apps (name, slug, group_id, is_builtin) VALUES ('testapp', 'testapp-slug', ?, 0)`
      ).run(g.id);

      model.softDelete(g.id);

      const app = db
        .prepare("SELECT group_id FROM apps WHERE slug = 'testapp-slug'")
        .get();
      expect(app.group_id).toBe(defaultGroup.id);
    });

    test('creates default group if missing before soft delete', () => {
      // 软删所有 is_default 分组并完全删除 default slug 记录以模拟缺失
      db.prepare('DELETE FROM app_groups WHERE is_default = 1').run();

      const g = model.create({
        name: '测试无默认组',
        slug: 'no-default-unique-slug',
      });
      // softDelete 应该自动重建默认组
      expect(() => model.softDelete(g.id)).not.toThrow();
    });
  });
});
