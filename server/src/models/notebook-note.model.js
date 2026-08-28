import { escapeLikePattern } from './base.model.js';

export class NotebookNoteModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * 分页查询（clamp 与返回契约对齐 BaseModel.paginate：limit 1~200、
   * 返回 { items, total, page, limit }）
   */
  findAll({
    page = 1,
    limit = 50,
    search = null,
    status = 'all',
    category = 'all',
  } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));

    const whereClauses = [];
    const params = [];

    if (status === 'pending') {
      whereClauses.push('completed = 0');
    } else if (status === 'completed') {
      whereClauses.push('completed = 1');
    }
    if (category && category !== 'all') {
      whereClauses.push('category = ?');
      params.push(category);
    }
    if (search) {
      // ESCAPE '\'：搜索词中的 %/_ 按字面量匹配
      whereClauses.push(
        "(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')"
      );
      const term = `%${escapeLikePattern(search)}%`;
      params.push(term, term);
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM notebook_notes ${where}`)
      .get(...params);
    const total = totalRow?.total || 0;
    const offset = (safePage - 1) * safeLimit;
    const rows = this.db
      .prepare(
        `SELECT * FROM notebook_notes ${where} ORDER BY completed ASC, created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, safeLimit, offset);

    return { items: rows, total, page: safePage, limit: safeLimit };
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM notebook_notes WHERE id = ?').get(id);
  }

  create({
    title,
    description = '',
    category = '',
    priority = 'medium',
    completed = false,
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO notebook_notes (title, description, category, priority, completed)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      title,
      description,
      category,
      priority,
      completed ? 1 : 0
    );
    return this.findById(res.lastInsertRowid);
  }

  update(id, data) {
    const fields = [];
    const params = [];
    const allowed = [
      'title',
      'description',
      'category',
      'priority',
      'completed',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'completed') params.push(data[key] ? 1 : 0);
        else params.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE notebook_notes SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);
    return this.findById(id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM notebook_notes WHERE id = ?').run(id);
  }
}
