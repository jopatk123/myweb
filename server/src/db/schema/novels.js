/**
 * Initializes novels table.
 * @param {import('better-sqlite3').Database} db
 */
export function initNovelTables(db) {
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

    CREATE INDEX IF NOT EXISTS idx_novels_file_path ON novels(file_path);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_novels_file_id ON novels(file_id) WHERE file_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_novels_created_at ON novels(created_at);
    CREATE INDEX IF NOT EXISTS idx_novels_uploader_id ON novels(uploader_id);
  `;

  db.exec(novelsTableSql);
  console.log('📚 Novels table initialized');
}
