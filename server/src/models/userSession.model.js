/**
 * 用户会话模型（构造函数注入 db）
 */
export class UserSessionModel {
  constructor(db) {
    this.db = db;
  }

  upsert({
    sessionId,
    nickname = 'Anonymous',
    avatarColor = '#007bff',
    autoOpenEnabled = true,
  }) {
    const updateStmt = this.db.prepare(`
      UPDATE user_sessions
      SET nickname = ?, avatar_color = ?, auto_open_enabled = ?,
          last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    const updateResult = updateStmt.run(
      nickname,
      avatarColor,
      autoOpenEnabled ? 1 : 0,
      sessionId
    );
    if (updateResult.changes === 0) {
      this.db
        .prepare(
          `
        INSERT INTO user_sessions (session_id, nickname, avatar_color, auto_open_enabled,
                                   last_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
        )
        .run(sessionId, nickname, avatarColor, autoOpenEnabled ? 1 : 0);
    }
    const result = this.findBySessionId(sessionId);
    if (result) result.autoOpenEnabled = Boolean(result.autoOpenEnabled);
    return result;
  }

  findBySessionId(sessionId) {
    const result = this.db
      .prepare(
        `
      SELECT id, session_id as sessionId, nickname, avatar_color as avatarColor,
             auto_open_enabled as autoOpenEnabled, last_active as lastActive,
             created_at as createdAt, updated_at as updatedAt
      FROM user_sessions WHERE session_id = ?
    `
      )
      .get(sessionId);
    if (result) result.autoOpenEnabled = Boolean(result.autoOpenEnabled);
    return result;
  }

  getAutoOpenEnabledSessions() {
    return this.db
      .prepare(
        `
      SELECT session_id as sessionId FROM user_sessions
      WHERE auto_open_enabled = 1
        AND datetime(last_active) >= datetime('now', '-30 minutes')
    `
      )
      .all()
      .map(r => r.sessionId);
  }

  updateLastActive(sessionId) {
    this.db
      .prepare(
        `
      UPDATE user_sessions
      SET last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `
      )
      .run(sessionId);
  }
}
