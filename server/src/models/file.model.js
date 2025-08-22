export class FileModel {
  constructor(db) {
    this.db = db;
  }

  findAll({ page = 1, limit = 20, type = null, search = null } = {}) {
    const whereClauses = [];
    const params = [];

    if (type) {
      whereClauses.push('type_category = ?');
      params.push(type);
    }
    if (search) {
      whereClauses.push('(original_name LIKE ? OR stored_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM files ${where}`)
      .get(...params);
    const total = totalRow?.total || 0;
    const offset = (Number(page) - 1) * Number(limit);
    const rows = this.db
      .prepare(
        `SELECT * FROM files ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, Number(limit), offset);

    return { items: rows, total };
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  }

  create(data) {
    const {
      originalName,
      storedName,
      filePath,
      mimeType,
      fileSize,
      typeCategory,
      fileUrl,
      uploaderId,
    } = data;

    const stmt = this.db.prepare(`
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      originalName,
      storedName,
      filePath,
      mimeType,
      fileSize,
      typeCategory,
      fileUrl || null,
      uploaderId || null
    );
    return this.findById(res.lastInsertRowid);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM files WHERE id = ?').run(id);
  }
}
