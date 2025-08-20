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
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (slug !== undefined) { fields.push('slug = ?'); params.push(slug); }
    if (is_default !== undefined) { fields.push('is_default = ?'); params.push(is_default ? 1 : 0); }
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


