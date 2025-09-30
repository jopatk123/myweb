/**
 * 应用分组模型（单分组）
 */
export class AppGroupModel {
  constructor(db) {
    this.db = db;
  }

  findAll() {
    const sql = `SELECT * FROM app_groups WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return this.db.prepare(sql).all();
  }

  findById(id) {
    const sql = `SELECT * FROM app_groups WHERE id = ? AND deleted_at IS NULL`;
    return this.db.prepare(sql).get(id);
  }

  create({ name, slug, is_default = 0 }) {
    // 如果提供了 slug，先检查是否存在（包含已被软删除的记录）
    if (slug) {
      const existing = this.db
        .prepare('SELECT id, deleted_at FROM app_groups WHERE slug = ?')
        .get(slug);
      if (existing) {
        // 若存在且已被软删除，则恢复该分组并更新字段
        if (existing.deleted_at) {
          const upd = this.db.prepare(
            'UPDATE app_groups SET name = ?, is_default = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          );
          upd.run(name, is_default ? 1 : 0, existing.id);
          return this.findById(existing.id);
        }
        // 存在且未删除，直接返回现有记录
        return this.findById(existing.id);
      }
    }

    const sql = `INSERT INTO app_groups (name, slug, is_default) VALUES (?, ?, ?)`;
    const info = this.db.prepare(sql).run(name, slug, is_default ? 1 : 0);
    return this.findById(info.lastInsertRowid);
  }

  update(id, { name, slug, is_default }) {
    // 兼容 camelCase 或 snake_case 的输入
    const payload = { name, slug, is_default };
    const fieldMap = {
      name: 'name',
      slug: 'slug',
      isDefault: 'is_default',
      is_default: 'is_default',
    };

    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      const col =
        fieldMap[key] || (fieldMap[key] === undefined ? null : fieldMap[key]);
      // 如果键已是 camelCase（如 isDefault），尝试映射
      const mapped =
        col ||
        fieldMap[
          Object.keys(fieldMap).find(k => k.toLowerCase() === key.toLowerCase())
        ];
      if (!mapped) continue;
      if (mapped === 'is_default') params.push(value ? 1 : 0);
      else params.push(value);
      fields.push(`${mapped} = ?`);
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE app_groups SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);
    return this.findById(id);
  }

  softDelete(id) {
    // 删除分组前：
    // 1) 不允许删除默认分组（is_default = 1）
    // 2) 确保存在默认分组（若不存在则创建），并把要删除分组下的应用移动到默认分组
    const row = this.db
      .prepare('SELECT id, is_default FROM app_groups WHERE id = ?')
      .get(id);
    if (!row) return false;
    if (row.is_default) {
      const err = new Error('默认分组不可删除');
      err.status = 400;
      throw err;
    }

    // 查找默认分组 id
    let def = this.db
      .prepare('SELECT id FROM app_groups WHERE is_default = 1')
      .get();
    let defaultId = def ? def.id : null;
    if (!defaultId) {
      // 若缺失默认分组，则创建一个
      const insert = this.db
        .prepare(
          'INSERT INTO app_groups (name, slug, is_default) VALUES (?,?,?)'
        )
        .run('默认', 'default', 1);
      defaultId = insert.lastInsertRowid;
      console.log(
        '[AppGroupModel.softDelete] created default group id=',
        defaultId
      );
    }

    // 将属于该分组的应用移动到默认分组
    try {
      const upd = this.db.prepare(
        'UPDATE apps SET group_id = ? WHERE group_id = ?'
      );
      const infoUpd = upd.run(defaultId, id);
      console.log(
        '[AppGroupModel.softDelete] moved apps count=',
        infoUpd.changes,
        'from group=',
        id,
        'to default=',
        defaultId
      );
    } catch (e) {
      console.warn(
        '[AppGroupModel.softDelete] failed to move apps:',
        e?.message || e
      );
    }

    // 标记软删除
    const sql = `
      UPDATE app_groups
      SET deleted_at = CURRENT_TIMESTAMP,
          is_default = CASE WHEN is_default = 1 THEN 0 ELSE is_default END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const info = this.db.prepare(sql).run(id);
    console.log(
      '[AppGroupModel.softDelete] soft-deleted id=',
      id,
      'changes=',
      info.changes
    );
    return info.changes === undefined ? true : info.changes;
  }
}
