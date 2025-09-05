/**
 * 壁纸分组模型
 */
export class WallpaperGroupModel {
  constructor(db) {
    this.db = db;
  }

  findAll() {
    return this.db
      .prepare(
        'SELECT * FROM wallpaper_groups WHERE deleted_at IS NULL ORDER BY is_default DESC, created_at ASC'
      )
      .all();
  }

  findById(id) {
    return this.db
      .prepare(
        'SELECT * FROM wallpaper_groups WHERE id = ? AND deleted_at IS NULL'
      )
      .get(id);
  }

  create(data) {
    const { name } = data;

    // If a group with the same name exists, handle accordingly.
    // - If it was soft-deleted (deleted_at IS NOT NULL), restore it (undelete).
    // - If it exists and is not deleted, consider it a duplicate and throw.
    const existing = this.db
      .prepare('SELECT * FROM wallpaper_groups WHERE name = ?')
      .get(name);

    if (existing) {
      if (existing.deleted_at) {
        // Restore soft-deleted group
        this.db
          .prepare(
            'UPDATE wallpaper_groups SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
          .run(existing.id);
        return this.findById(existing.id);
      }

      const err = new Error('分组已存在');
      err.status = 400;
      throw err;
    }

    const sql = 'INSERT INTO wallpaper_groups (name) VALUES (?)';

    const result = this.db.prepare(sql).run(name);
    return this.findById(result.lastInsertRowid);
  }

  update(id, data) {
    // 支持 camelCase 或 snake_case 字段名映射
    const fieldMap = {
      name: 'name',
      isDefault: 'is_default',
      is_default: 'is_default',
      isCurrent: 'is_current',
      is_current: 'is_current',
    };

    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(data)) {
      const col = fieldMap[key];
      if (!col) continue;
      if (col === 'is_default' || col === 'is_current') {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
      fields.push(`${col} = ?`);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE wallpaper_groups SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);

    return this.findById(id);
  }

  delete(id) {
    // 检查是否为默认分组
    const group = this.findById(id);
    if (group?.is_default) {
      throw new Error('不能删除默认分组');
    }

    const sql =
      'UPDATE wallpaper_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.db.prepare(sql).run(id);
  }

  getDefault() {
    return this.db
      .prepare(
        'SELECT * FROM wallpaper_groups WHERE is_default = 1 AND deleted_at IS NULL'
      )
      .get();
  }

  getCurrent() {
    return this.db
      .prepare(
        'SELECT * FROM wallpaper_groups WHERE is_current = 1 AND deleted_at IS NULL'
      )
      .get();
  }

  setCurrent(id) {
    // 先清空当前标记（只影响未删除的分组）
    this.db
      .prepare(
        'UPDATE wallpaper_groups SET is_current = 0 WHERE deleted_at IS NULL'
      )
      .run();
    // 设置指定分组为当前
    this.db
      .prepare(
        'UPDATE wallpaper_groups SET is_current = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL'
      )
      .run(id);
    return this.findById(id);
  }
}
