/**
 * 留言模型（构造函数注入 db）
 */
import logger from '../utils/logger.js';

export const messageModelLogger = logger.child('MessageModel');

export class MessageModel {
  constructor(db) {
    this.db = db;
    /** @type {boolean|null} FTS5 可用性缓存（null = 未检测） */
    this._ftsReady = null;
  }

  _parseImages(images) {
    if (!images) return images;
    if (Array.isArray(images)) return images;
    if (typeof images !== 'string') return null;

    try {
      const parsed = JSON.parse(images);
      if (!Array.isArray(parsed)) {
        messageModelLogger.warn('Message images JSON is not an array', {
          images,
        });
        return null;
      }
      return parsed;
    } catch (error) {
      messageModelLogger.warn('Failed to parse message images JSON', {
        error: error instanceof Error ? error.message : String(error),
        images,
      });
      return null;
    }
  }

  /** 检测 FTS5 虚拟表是否存在（结果缓存，进程生命周期内只查一次） */
  _hasFts5() {
    if (this._ftsReady === null) {
      this._ftsReady =
        this.db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='messages_fts'"
          )
          .get().c > 0;
    }
    return this._ftsReady;
  }

  /** 将搜索词转义为 FTS5 phrase query（用双引号包裹，内部双引号转义） */
  _escapeForFts5(term) {
    return `"${term.replace(/"/g, '""')}"`;
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

  /**
   * 将 SQLite CURRENT_TIMESTAMP（UTC，格式 `YYYY-MM-DD HH:MM:SS`）
   * 转换为 ISO 8601 字符串（`YYYY-MM-DDTHH:MM:SSZ`）。
   * 避免前端 `new Date('YYYY-MM-DD HH:MM:SS')` 在不同浏览器中被解析为本地时间，
   * 导致留言时间偏移。
   */
  _toIsoTimestamp(value) {
    if (!value || typeof value !== 'string') return value;
    // 已经是 ISO 格式则原样返回
    if (value.endsWith('Z') || value.includes('T')) return value;
    return `${value.replace(' ', 'T')}Z`;
  }

  _normalizeRow(row) {
    if (!row) return row;
    if (row.images) row.images = this._parseImages(row.images);
    if (row.createdAt) row.createdAt = this._toIsoTimestamp(row.createdAt);
    if (row.updatedAt) row.updatedAt = this._toIsoTimestamp(row.updatedAt);
    return row;
  }

  findById(id) {
    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages WHERE id = ?
    `);
    return this._normalizeRow(stmt.get(id));
  }

  findAll({ limit = 50, offset = 0, order = 'DESC', search = '' } = {}) {
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    const hasSearch = normalizedSearch.length > 0;

    let whereSql = '';
    const params = [];

    if (hasSearch) {
      if (this._hasFts5()) {
        whereSql =
          'WHERE id IN (SELECT rowid FROM messages_fts WHERE messages_fts MATCH ?)';
        params.push(this._escapeForFts5(normalizedSearch));
      } else {
        whereSql = 'WHERE content LIKE ? OR author_name LIKE ?';
        const term = `%${normalizedSearch}%`;
        params.push(term, term);
      }
    }

    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages ${whereSql}
      ORDER BY created_at ${order}
      LIMIT ? OFFSET ?
    `);
    params.push(limit, offset);
    return stmt.all(...params).map(m => this._normalizeRow(m));
  }

  count({ search = '' } = {}) {
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    if (!normalizedSearch) {
      return this.db.prepare('SELECT COUNT(*) as count FROM messages').get()
        .count;
    }

    if (this._hasFts5()) {
      return this.db
        .prepare(
          'SELECT COUNT(*) as count FROM messages WHERE id IN (SELECT rowid FROM messages_fts WHERE messages_fts MATCH ?)'
        )
        .get(this._escapeForFts5(normalizedSearch)).count;
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
    return stmt.all().map(m => this._normalizeRow(m));
  }

  /**
   * 分批迭代所有带图留言，避免 clearAll 一次性读入内存导致 OOM。
   * 返回 generator，每次 yield 一批（最多 batchSize 条）。
   * @param {number} batchSize
   * @returns {Generator<Array<object>>}
   */
  *findAllWithImagesBatched(batchSize = 500) {
    if (!Number.isFinite(batchSize) || batchSize <= 0) {
      throw new Error('batchSize 必须是正整数');
    }
    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages WHERE images IS NOT NULL AND images != ''
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `);
    let offset = 0;
    while (true) {
      const rows = stmt.all(batchSize, offset);
      if (rows.length === 0) break;
      yield rows.map(m => this._normalizeRow(m));
      if (rows.length < batchSize) break;
      offset += batchSize;
    }
  }

  deleteAll() {
    return this.db.prepare('DELETE FROM messages').run();
  }
}
