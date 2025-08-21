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
      is_default: 'is_default'
    };

    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      const col = fieldMap[key] || (fieldMap[key] === undefined ? null : fieldMap[key]);
      // 如果键已是 camelCase（如 isDefault），尝试映射
      const mapped = col || fieldMap[Object.keys(fieldMap).find(k => k.toLowerCase() === key.toLowerCase())];
      if (!mapped) continue;
      if (mapped === 'is_default') params.push(value ? 1 : 0); else params.push(value);
      fields.push(`${mapped} = ?`);
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE app_groups SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);
    return this.findById(id);
  }

  softDelete(id) {
    const sql = `UPDATE app_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(id);
    return true;
  }
}


