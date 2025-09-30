/**
 * Ensure novels and related tables include proper file relations.
 * @param {import('better-sqlite3').Database} db
 */
export function ensureNovelRelations(db) {
  try {
    const novelsSqlRow = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='novels'"
      )
      .get();
    const novelsSql = String(novelsSqlRow?.sql || '');

    const needsNovelRebuild =
      !/file_id/i.test(novelsSql) ||
      !/FOREIGN\s+KEY\s*\(file_id\)/i.test(novelsSql);

    if (needsNovelRebuild) {
      console.log('🛠️ Migrating novels table to add file_id foreign key');
      const migrateNovels = db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS novels_new (
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
        `);

        db.exec(`
          INSERT INTO novels_new (
            id, title, author, original_name, stored_name, file_path,
            mime_type, file_size, file_url, uploader_id, file_id,
            created_at, updated_at
          )
          SELECT
            n.id,
            n.title,
            n.author,
            n.original_name,
            n.stored_name,
            n.file_path,
            n.mime_type,
            n.file_size,
            n.file_url,
            n.uploader_id,
            (
              SELECT f.id FROM files f
              WHERE f.stored_name = n.stored_name
              ORDER BY f.id DESC
              LIMIT 1
            ) AS file_id,
            n.created_at,
            n.updated_at
          FROM novels n;
        `);

        db.exec('DROP TABLE novels;');
        db.exec('ALTER TABLE novels_new RENAME TO novels;');

        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_novels_file_path ON novels(file_path);'
        );
        db.exec(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_novels_file_id ON novels(file_id) WHERE file_id IS NOT NULL;'
        );
      });

      migrateNovels();
      console.log('✅ Novels table migration complete');
    }

    const bookmarksSqlRow = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='novel_bookmarks'"
      )
      .get();
    const bookmarksSql = String(bookmarksSqlRow?.sql || '');

    const needsBookmarkRebuild =
      !/FOREIGN\s+KEY\s*\(file_id\)/i.test(bookmarksSql) ||
      /file_id\s+TEXT/i.test(bookmarksSql);

    if (needsBookmarkRebuild) {
      console.log('🛠️ Migrating novel_bookmarks table to add file relations');
      const migrateBookmarks = db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS novel_bookmarks_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id TEXT NOT NULL,
            novel_id INTEGER,
            file_id INTEGER,
            title TEXT NOT NULL,
            chapter_index INTEGER NOT NULL DEFAULT 0,
            scroll_position INTEGER DEFAULT 0,
            note TEXT,
            device_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
          );
        `);

        db.exec(`
          INSERT INTO novel_bookmarks_new (
            id, book_id, novel_id, file_id, title, chapter_index,
            scroll_position, note, device_id, created_at, updated_at, deleted_at
          )
          SELECT
            nb.id,
            nb.book_id,
            n.id AS novel_id,
            f.id AS file_id,
            nb.title,
            nb.chapter_index,
            nb.scroll_position,
            nb.note,
            nb.device_id,
            nb.created_at,
            nb.updated_at,
            nb.deleted_at
          FROM novel_bookmarks nb
          LEFT JOIN files f ON f.id = CAST(nb.file_id AS INTEGER)
          LEFT JOIN novels n ON (
            (n.file_id = f.id) OR
            (n.stored_name = f.stored_name)
          );
        `);

        db.exec('DROP TABLE novel_bookmarks;');
        db.exec('ALTER TABLE novel_bookmarks_new RENAME TO novel_bookmarks;');

        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_file_id ON novel_bookmarks(file_id);'
        );
        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_novel_id ON novel_bookmarks(novel_id);'
        );
        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_device_id ON novel_bookmarks(device_id);'
        );
      });

      migrateBookmarks();
      console.log('✅ novel_bookmarks table migration complete');
    }
  } catch (err) {
    console.error('❌ Failed to ensure novel relations:', err);
    throw err;
  }
}
