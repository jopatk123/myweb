/**
 * 留言模型
 */
import { getDb } from '../utils/dbPool.js';

export class MessageModel {
  /**
   * 创建留言
   */
  static create({ content, authorName = 'Anonymous', authorColor = '#007bff', sessionId }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO messages (content, author_name, author_color, session_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(content, authorName, authorColor, sessionId);
    
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
             session_id as sessionId, created_at as createdAt, updated_at as updatedAt
      FROM messages 
      WHERE id = ?
    `);
    
    return stmt.get(id);
  }

  /**
   * 获取留言列表
   */
  static findAll({ limit = 50, offset = 0, order = 'DESC' } = {}) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, content, author_name as authorName, author_color as authorColor, 
             session_id as sessionId, created_at as createdAt, updated_at as updatedAt
      FROM messages 
      ORDER BY created_at ${order}
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset);
  }

  /**
   * 获取留言总数
   */
  static count() {
    const db = getDb();
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM messages`);
    return stmt.get().count;
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
             session_id as sessionId, created_at as createdAt, updated_at as updatedAt
      FROM messages 
      WHERE datetime(created_at) >= datetime('now', '-${minutes} minutes')
      ORDER BY created_at DESC
    `);
    
    return stmt.all();
  }
}