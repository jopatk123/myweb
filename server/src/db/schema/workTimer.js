/**
 * Initializes work timer related tables: `work_sessions`, `work_stats`, and `work_daily_totals`.
 * @param {import('better-sqlite3').Database} db
 */
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

  const workStatsSql = `
    CREATE TABLE IF NOT EXISTS work_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_ms INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ensure there is at least one row to simplify upserts
  `;

  const workDailyTotalsSql = `
    CREATE TABLE IF NOT EXISTS work_daily_totals (
      date TEXT PRIMARY KEY,
      total_ms INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_work_daily_totals_date ON work_daily_totals(date);
  `;

  db.exec(workSessionsSql);
  db.exec(workStatsSql);
  db.exec(workDailyTotalsSql);

  const insertStats = db.prepare(
    `INSERT OR IGNORE INTO work_stats (id, total_ms) VALUES (1, 0)`
  );
  try {
    insertStats.run();
  } catch (e) {
    console.warn('初始化 work_stats 失败（非致命）:', e.message || e);
  }

  console.log('⏱️ Work timer tables initialized');
}
