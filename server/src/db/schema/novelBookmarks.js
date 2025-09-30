/**
 * Initializes novel bookmarks table `novel_bookmarks`.
 * @param {import('better-sqlite3').Database} db
 */
export function initNovelBookmarkTables(db) {
  const novelBookmarksSql = `
    CREATE TABLE IF NOT EXISTS novel_bookmarks (
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

    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_book_id ON novel_bookmarks(book_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_file_id ON novel_bookmarks(file_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_novel_id ON novel_bookmarks(novel_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_device_id ON novel_bookmarks(device_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_created_at ON novel_bookmarks(created_at);
  `;

  db.exec(novelBookmarksSql);
  console.log('📖 Novel bookmarks table initialized');
}
