/**
 * 用户会话模型
 */
import { getDb } from '../utils/dbPool.js';

export class UserSessionModel {
  static upsert({ sessionId, nickname = 'Anonymous', avatarColor = '#007bff', autoOpenEnabled = true }) {
    const db = getDb();
    
    const updateStmt = db.prepare(`
      UPDATE user_sessions 
      SET nickname = ?, avatar_color = ?, auto_open_enabled = ?, 
          last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    
    const updateResult = updateStmt.run(nickname, avatarColor, autoOpenEnabled ? 1 : 0, sessionId);
    
    if (updateResult.changes === 0) {
      const insertStmt = db.prepare(`
        INSERT INTO user_sessions (session_id, nickname, avatar_color, auto_open_enabled, 
                                 last_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      insertStmt.run(sessionId, nickname, avatarColor, autoOpenEnabled ? 1 : 0);
    }
    
    return this.findBySessionId(sessionId);
  }

  static findBySessionId(sessionId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, session_id as sessionId, nickname, avatar_color as avatarColor, 
             auto_open_enabled as autoOpenEnabled, last_active as lastActive,
             created_at as createdAt, updated_at as updatedAt
      FROM user_sessions 
      WHERE session_id = ?
    `);
    
    return stmt.get(sessionId);
  }

  static getAutoOpenEnabledSessions() {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT session_id as sessionId
      FROM user_sessions 
      WHERE auto_open_enabled = 1 
        AND datetime(last_active) >= datetime('now', '-30 minutes')
    `);
    
    return stmt.all().map(row => row.sessionId);
  }
}