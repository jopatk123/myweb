export class FileModel {
  constructor(db) {
    this.db = db;
  }

  findAll({ page = 1, limit = 20, type = null, search = null } = {}) {
    const allowedTypes = new Set([
      'image',
      'video',
      'word',
      'excel',
      'archive',
      'other',
      'novel',
      'music',
    ]);

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const normalizedSearch = (search || '').trim();

    const whereClauses = [];
    const params = [];

    if (type && allowedTypes.has(String(type).toLowerCase())) {
      whereClauses.push('type_category = ?');
      params.push(String(type).toLowerCase());
    }
    if (normalizedSearch) {
      whereClauses.push('(original_name LIKE ? OR stored_name LIKE ?)');
      params.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`);
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM files ${where}`)
      .get(...params);
    const total = totalRow?.total || 0;
    const offset = (safePage - 1) * safeLimit;
    const rows = this.db
      .prepare(
        `SELECT * FROM files ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, safeLimit, offset);

    return { items: rows, total, page: safePage, limit: safeLimit };
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
