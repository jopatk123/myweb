/**
 * 留言模型（构造函数注入 db）
 */
export class MessageModel {
  constructor(db) {
    this.db = db;
  }

  create({
    content,
    authorName = 'Anonymous',
    authorColor = '#007bff',
    sessionId,
    images = null,
    imageType = null,
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO messages (content, author_name, author_color, session_id, images, image_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const imagesJson = images ? JSON.stringify(images) : null;
    const result = stmt.run(
      content,
      authorName,
      authorColor,
      sessionId,
      imagesJson,
      imageType
    );
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages WHERE id = ?
    `);
    const message = stmt.get(id);
    if (message?.images) message.images = JSON.parse(message.images);
    return message;
  }

  findAll({ limit = 50, offset = 0, order = 'DESC', search = '' } = {}) {
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    const hasSearch = normalizedSearch.length > 0;
    const whereSql = hasSearch
      ? 'WHERE content LIKE ? OR author_name LIKE ?'
      : '';
    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages ${whereSql}
      ORDER BY created_at ${order}
      LIMIT ? OFFSET ?
    `);
    const params = [];
    if (hasSearch) {
      const term = `%${normalizedSearch}%`;
      params.push(term, term);
    }
    params.push(limit, offset);
    return stmt.all(...params).map(m => {
      if (m.images) m.images = JSON.parse(m.images);
      return m;
    });
  }

  count({ search = '' } = {}) {
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    if (!normalizedSearch) {
      return this.db.prepare('SELECT COUNT(*) as count FROM messages').get()
        .count;
    }
    const term = `%${normalizedSearch}%`;
    return this.db
      .prepare(
        'SELECT COUNT(*) as count FROM messages WHERE content LIKE ? OR author_name LIKE ?'
      )
      .get(term, term).count;
  }

  deleteById(id) {
    return this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }

  findAllWithImages() {
    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages WHERE images IS NOT NULL AND images != ''
      ORDER BY created_at DESC
    `);
    return stmt.all().map(m => {
      if (m.images) m.images = JSON.parse(m.images);
      return m;
    });
  }

  deleteAll() {
    return this.db.prepare('DELETE FROM messages').run();
  }

  getRecent(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(limit).map(m => {
      if (m.images) m.images = JSON.parse(m.images);
      return m;
    });
  }
}
