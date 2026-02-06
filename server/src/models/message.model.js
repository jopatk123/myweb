/**
 * 留言模型
 */
import { getDb } from '../utils/dbPool.js';

export class MessageModel {
  /**
   * 创建留言
   */
  static create({
    content,
    authorName = 'Anonymous',
    authorColor = '#007bff',
    sessionId,
    images = null,
    imageType = null,
  }) {
    const db = getDb();
    const stmt = db.prepare(`
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

    // 返回创建的留言
    return this.findById(result.lastInsertRowid);
  }

  /**
   * 根据ID查找留言
   */
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor, 
             session_id as sessionId, images, image_type as imageType, created_at as createdAt, updated_at as updatedAt
      FROM messages 
      WHERE id = ?
    `);

    const message = stmt.get(id);
    if (message && message.images) {
      message.images = JSON.parse(message.images);
    }
    return message;
  }

  /**
   * 获取留言列表
   */
  static findAll({ limit = 50, offset = 0, order = 'DESC', search = '' } = {}) {
    const db = getDb();
    const normalizedSearch =
      typeof search === 'string' ? search.trim() : '';
    const hasSearch = normalizedSearch.length > 0;
    const whereSql = hasSearch
      ? 'WHERE content LIKE ? OR author_name LIKE ?'
      : '';
    const stmt = db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor, 
             session_id as sessionId, images, image_type as imageType, created_at as createdAt, updated_at as updatedAt
      FROM messages 
      ${whereSql}
      ORDER BY created_at ${order}
      LIMIT ? OFFSET ?
    `);

    const params = [];
    if (hasSearch) {
      const term = `%${normalizedSearch}%`;
      params.push(term, term);
    }
    params.push(limit, offset);

    const messages = stmt.all(...params);
    return messages.map(message => {
      if (message.images) {
        message.images = JSON.parse(message.images);
      }
      return message;
    });
  }

  /**
   * 获取留言总数
   */
  static count({ search = '' } = {}) {
    const db = getDb();
    const normalizedSearch =
      typeof search === 'string' ? search.trim() : '';
    if (!normalizedSearch) {
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM messages`);
      return stmt.get().count;
    }

    const term = `%${normalizedSearch}%`;
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM messages WHERE content LIKE ? OR author_name LIKE ?`
    );
    return stmt.get(term, term).count;
  }

  /**
   * 删除留言
   */
  static deleteById(id) {
    const db = getDb();
    const stmt = db.prepare(`DELETE FROM messages WHERE id = ?`);
    return stmt.run(id);
  }

  /**
   * 获取最近的留言（用于实时推送）
   */
  static getRecent(minutes = 5) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor, 
             session_id as sessionId, images, image_type as imageType, created_at as createdAt, updated_at as updatedAt
      FROM messages 
      WHERE datetime(created_at) >= datetime('now', '-${minutes} minutes')
      ORDER BY created_at DESC
    `);

    const messages = stmt.all();
    return messages.map(message => {
      if (message.images) {
        message.images = JSON.parse(message.images);
      }
      return message;
    });
  }

  /**
   * 获取所有带图片的留言
   */
  static findAllWithImages() {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor, 
             session_id as sessionId, images, image_type as imageType, created_at as createdAt, updated_at as updatedAt
      FROM messages 
      WHERE images IS NOT NULL AND images != ''
      ORDER BY created_at DESC
    `);

    const messages = stmt.all();
    return messages.map(message => {
      if (message.images) {
        message.images = JSON.parse(message.images);
      }
      return message;
    });
  }

  /**
   * 删除所有留言
   */
  static deleteAll() {
    const db = getDb();
    const stmt = db.prepare(`DELETE FROM messages`);
    return stmt.run();
  }
}
