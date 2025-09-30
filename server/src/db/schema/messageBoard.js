/**
 * Initializes message board related tables: `messages` and `user_sessions`.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initMessageTables(db) {
  const messagesTableSql = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_name VARCHAR(100) DEFAULT 'Anonymous',
      author_color VARCHAR(7) DEFAULT '#007bff',
      session_id VARCHAR(36) NOT NULL,
      images TEXT,
      image_type VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  `;

  const userSessionsTableSql = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id VARCHAR(36) UNIQUE NOT NULL,
      nickname VARCHAR(100) DEFAULT 'Anonymous',
      avatar_color VARCHAR(7) DEFAULT '#007bff',
      auto_open_enabled BOOLEAN DEFAULT 1,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active);
  `;

  db.exec(messagesTableSql);
  db.exec(userSessionsTableSql);

  console.log('💬 Message board tables initialized');
}
