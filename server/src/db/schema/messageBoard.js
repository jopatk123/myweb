/**
 * Initializes message board related tables: `messages` and `user_sessions`.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
import logger from '../../utils/logger.js';

const schemaLogger = logger.child('Schema:MessageBoard');

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

  // FTS5 虚拟表：加速 content / author_name 的全文搜索
  // 使用 external-content 模式（content=messages），由触发器保持同步
  const ftsExisted =
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='messages_fts'"
      )
      .get().c > 0;

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      author_name,
      content=messages,
      content_rowid=id
    );
  `);

  if (!ftsExisted) {
    // 首次建表，用现有数据填充索引
    db.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')");
    schemaLogger.info('FTS5 index built from existing messages');
  }

  // 触发器：INSERT / UPDATE / DELETE 时自动同步 FTS 索引
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content, author_name)
      VALUES (new.id, new.content, new.author_name);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, author_name)
      VALUES ('delete', old.id, old.content, old.author_name);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, author_name)
      VALUES ('delete', old.id, old.content, old.author_name);
      INSERT INTO messages_fts(rowid, content, author_name)
      VALUES (new.id, new.content, new.author_name);
    END;
  `);

  schemaLogger.info('Message board tables initialized');
}
