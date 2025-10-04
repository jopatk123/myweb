/**
 * Initializes novels table.
 * @param {import('better-sqlite3').Database} db
 */
export function initNovelTables(db) {
  // 先创建表结构（如果不存在）
  const novelsTableSql = `
    CREATE TABLE IF NOT EXISTS novels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      author TEXT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_url TEXT,
      uploader_id TEXT,
      file_id INTEGER UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );
  `;

  db.exec(novelsTableSql);

  // 检查表结构是否包含 file_id 列，只有包含时才创建相关索引
  const novelsSqlRow = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='novels'"
    )
    .get();
  const novelsSql = String(novelsSqlRow?.sql || '');
  const hasFileIdColumn = /file_id/i.test(novelsSql);

  // 创建基础索引
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_novels_file_path ON novels(file_path);'
  );
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_novels_created_at ON novels(created_at);'
  );
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_novels_uploader_id ON novels(uploader_id);'
  );

  // 只有当 file_id 列存在时才创建该索引
  if (hasFileIdColumn) {
    db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_novels_file_id ON novels(file_id) WHERE file_id IS NOT NULL;'
    );
  }

  console.log('📚 Novels table initialized');
}
