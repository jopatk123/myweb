/**
 * 留言模型（构造函数注入 db）
 */
import logger from '../utils/logger.js';
import { escapeLikePattern } from './base.model.js';

export const messageModelLogger = logger.child('MessageModel');

/**
 * CJK 字符检测（日文假名 / 汉字 / 韩文谚文等）。
 * FTS5 默认 unicode61 分词器不会切分 CJK 连续文本（整段中文被视为单一 token），
 * 中文子串搜索在 MATCH 路径下必然未命中，因此含 CJK 的搜索词必须回退 LIKE。
 */
const CJK_CHAR_PATTERN =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

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

  /**
   * 行数据出站归一化：解析 images JSON、时间戳转 ISO，
   * 并剥离 sessionId —— 会话标识是服务端内部字段，不应随留言
   * 响应 / WS 广播外露（否则可被第三方用于冒充他人设置）。
   */
  _normalizeRow(row) {
    if (!row) return row;
    delete row.sessionId;
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
    // 排序方向白名单校验（与 BaseModel.normalizeOrderByClause 同等防御），
    // order 直接拼入 SQL，若不校验未来透传外部输入会成为注入点
    const normalizedOrder = String(order || 'DESC')
      .trim()
      .toUpperCase();
    if (normalizedOrder !== 'ASC' && normalizedOrder !== 'DESC') {
      throw new Error(`Unsafe ORDER BY direction: ${order}`);
    }

    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    const hasSearch = normalizedSearch.length > 0;

    let whereSql = '';
    const params = [];

    if (hasSearch) {
      // 含 CJK 的搜索词不走 FTS5：unicode61 分词器不切分 CJK 连续文本，
      // MATCH 只能命中"搜索词恰好等于整段连续中文"的场景，子串搜索会静默失效
      if (this._hasFts5() && !CJK_CHAR_PATTERN.test(normalizedSearch)) {
        whereSql =
          'WHERE id IN (SELECT rowid FROM messages_fts WHERE messages_fts MATCH ?)';
        params.push(this._escapeForFts5(normalizedSearch));
      } else {
        // ESCAPE '\'：搜索词中的 %/_ 经 escapeLikePattern 转义后按字面量匹配
        whereSql =
          "WHERE content LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\'";
        const term = `%${escapeLikePattern(normalizedSearch)}%`;
        params.push(term, term);
      }
    }

    const stmt = this.db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor,
             session_id as sessionId, images, image_type as imageType,
             created_at as createdAt, updated_at as updatedAt
      FROM messages ${whereSql}
      ORDER BY created_at ${normalizedOrder}
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

    if (this._hasFts5() && !CJK_CHAR_PATTERN.test(normalizedSearch)) {
      return this.db
        .prepare(
          'SELECT COUNT(*) as count FROM messages WHERE id IN (SELECT rowid FROM messages_fts WHERE messages_fts MATCH ?)'
        )
        .get(this._escapeForFts5(normalizedSearch)).count;
    }

    const term = `%${escapeLikePattern(normalizedSearch)}%`;
    return this.db
      .prepare(
        "SELECT COUNT(*) as count FROM messages WHERE content LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\'"
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

  /**
   * 事务化清空：在同一事务内完成"收集全部图片路径 + 删除所有留言"，
   * 消除两步之间新写入留言被删行但图片未收集的孤儿文件竞态窗口。
   * @param {number} batchSize
   * @returns {{ images: Array<object>, changes: number }}
   */
  collectImagesAndDeleteAll(batchSize = 500) {
    return this.db.transaction(() => {
      const images = [];
      for (const batch of this.findAllWithImagesBatched(batchSize)) {
        for (const message of batch) {
          if (Array.isArray(message.images)) {
            images.push(...message.images);
          }
        }
      }
      const result = this.deleteAll();
      return { images, changes: result.changes };
    })();
  }

  deleteAll() {
    return this.db.prepare('DELETE FROM messages').run();
  }
}
