/**
 * Initializes work timer related tables: `work_sessions`.
 * @param {import('better-sqlite3').Database} db
 */
import logger from '../../utils/logger.js';

const schemaLogger = logger.child('Schema:WorkTimer');

export function initWorkTimerTables(db) {
  const workSessionsSql = `
    CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      last_update DATETIME,
      end_time DATETIME,
      duration INTEGER DEFAULT 0,
      target_end_time TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_work_sessions_date ON work_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_work_sessions_is_active ON work_sessions(is_active);
  `;

  db.exec(workSessionsSql);

  schemaLogger.info('Work timer tables initialized');
}
