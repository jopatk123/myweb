/**
 * Initializes file-related tables: `files`.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initFileTables(db) {
  const filesTableSql = `
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      type_category TEXT NOT NULL CHECK(type_category IN ('image', 'video', 'word', 'excel', 'archive', 'other', 'novel', 'music')),
      file_url TEXT,
      uploader_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);
    CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);
    CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
  `;

  db.exec(filesTableSql);
  console.log('📁 File management tables initialized');
}
