/**
 * Ensure files.type_category includes novel and music in CHECK constraint.
 * @param {import('better-sqlite3').Database} db
 */
export function ensureFilesTypeCategoryIncludesNovel(db) {
  try {
    const row = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='files'"
      )
      .get();
    const createSql = String(row?.sql || '');

    if (
      /CHECK\s*\(type_category\s+IN/i.test(createSql) &&
      /'novel'/.test(createSql) &&
      /'music'/.test(createSql)
    ) {
      return;
    }

    console.log(
      '🛠️ Migrating files table to include “novel” and “music” in type_category CHECK'
    );

    const migrateFiles = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS files_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_name TEXT NOT NULL,
          stored_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          type_category TEXT NOT NULL CHECK(type_category IN ('image','video','word','excel','archive','other','novel','music')),
          file_url TEXT,
          uploader_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      db.exec(`
        INSERT INTO files_new (id, original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id, created_at, updated_at)
        SELECT id, original_name, stored_name, file_path, mime_type, file_size,
          CASE
            WHEN type_category IS NULL OR type_category = '' THEN 'other'
            ELSE type_category
          END,
          file_url, uploader_id, created_at, updated_at
        FROM files;
      `);

      db.exec('DROP TABLE files;');
      db.exec('ALTER TABLE files_new RENAME TO files;');

      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);'
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);'
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);'
      );
    });

    migrateFiles();

    console.log('✅ files table migration complete');
  } catch (err) {
    console.error(
      '❌ Failed to ensure files.type_category includes novel:',
      err
    );
    throw err;
  }
}
