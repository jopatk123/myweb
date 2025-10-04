/**
 * Initializes novel bookmarks table `novel_bookmarks`.
 * @param {import('better-sqlite3').Database} db
 */
export function initNovelBookmarkTables(db) {
  // 先创建表结构（如果不存在）
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
  `;

  db.exec(novelBookmarksSql);

  // 检查表结构是否包含 novel_id 和 file_id 列
  const bookmarksSqlRow = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='novel_bookmarks'"
    )
    .get();
  const bookmarksSql = String(bookmarksSqlRow?.sql || '');
  const hasNovelIdColumn = /novel_id/i.test(bookmarksSql);
  const hasFileIdColumn = /file_id/i.test(bookmarksSql);

  // 创建基础索引
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_book_id ON novel_bookmarks(book_id);'
  );
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_device_id ON novel_bookmarks(device_id);'
  );
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_created_at ON novel_bookmarks(created_at);'
  );

  // 只有当相应列存在时才创建索引
  if (hasFileIdColumn) {
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_file_id ON novel_bookmarks(file_id);'
    );
  }
  if (hasNovelIdColumn) {
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_novel_id ON novel_bookmarks(novel_id);'
    );
  }

  console.log('📖 Novel bookmarks table initialized');
}
