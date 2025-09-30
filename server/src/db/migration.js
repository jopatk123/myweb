/**
 * Migration helpers: ensure columns/tables are present and perform migrations
 */

/**
 * Ensure wallpapers table has required columns and perform migrations to remove deprecated columns
 * @param {import('better-sqlite3').Database} db
 */
export function ensureWallpaperColumns(db) {
  const existingColumns = db.prepare('PRAGMA table_info(wallpapers)').all();
  const existingColumnNames = new Set(existingColumns.map(col => col.name));

  const maybeAddColumn = (name, type) => {
    if (!existingColumnNames.has(name)) {
      db.prepare(`ALTER TABLE wallpapers ADD COLUMN ${name} ${type}`).run();
      console.log(`🛠️ Added column to wallpapers: ${name} ${type}`);
    }
  };

  // 与模型一致: filename, original_name, file_path, file_size
  maybeAddColumn('filename', 'TEXT');
  maybeAddColumn('original_name', 'TEXT');
  maybeAddColumn('file_path', 'TEXT');
  maybeAddColumn('file_size', 'INTEGER');
  // 也需要: name（旧库可能缺失）。description 字段已移除
  maybeAddColumn('name', 'TEXT');

  // 如果旧库还存在 wallpapers.description 列，则迁移并删除该列（已在之前添加）
  if (existingColumnNames.has('description')) {
    try {
      console.log(
        '🛠️ Detected deprecated `description` column on wallpapers, starting migration to remove it'
      );
      const migrateWallpapers = db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS wallpapers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mime_type TEXT,
            group_id INTEGER REFERENCES wallpaper_groups(id) ON DELETE SET NULL,
            name TEXT,
            is_active INTEGER DEFAULT 0,
            deleted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            filename TEXT,
            original_name TEXT,
            file_path TEXT,
            file_size INTEGER
          );
        `);

        db.exec(`
          INSERT INTO wallpapers_new (id, mime_type, group_id, name, is_active, deleted_at, created_at, updated_at, filename, original_name, file_path, file_size)
          SELECT id, mime_type, group_id, name, is_active, deleted_at, created_at, updated_at, filename, original_name, file_path, file_size FROM wallpapers;
        `);

        db.exec('DROP TABLE wallpapers;');
        db.exec('ALTER TABLE wallpapers_new RENAME TO wallpapers;');

        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_wallpapers_group_id ON wallpapers(group_id);'
        );
        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_wallpapers_is_active ON wallpapers(is_active);'
        );
        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_wallpapers_deleted_at ON wallpapers(deleted_at);'
        );
      });

      migrateWallpapers();

      console.log(
        '✅ Migration complete: `description` column removed from wallpapers'
      );
    } catch (err) {
      console.error(
        '❌ Failed to migrate wallpapers table to remove description column:',
        err
      );
      throw err;
    }
  }

  // 如果旧库中 wallpaper_groups 表包含 description 列，则迁移并删除该列
  const groupColumns = db.prepare('PRAGMA table_info(wallpaper_groups)').all();
  const groupColumnNames = new Set(groupColumns.map(col => col.name));
  // 如果缺少 is_current 列，直接添加
  if (!groupColumnNames.has('is_current')) {
    db.prepare(
      'ALTER TABLE wallpaper_groups ADD COLUMN is_current BOOLEAN DEFAULT 0'
    ).run();
    console.log(
      '🛠️ Added column to wallpaper_groups: is_current BOOLEAN DEFAULT 0'
    );
    // 若新增了该列，且当前没有任何分组标记为当前，则把默认分组设为当前
    try {
      const cnt = db
        .prepare(
          'SELECT COUNT(1) AS c FROM wallpaper_groups WHERE is_current = 1 AND deleted_at IS NULL'
        )
        .get().c;
      if (cnt === 0) {
        db.prepare(
          'UPDATE wallpaper_groups SET is_current = 1 WHERE is_default = 1 AND deleted_at IS NULL'
        ).run();
        console.log(
          '✅ Set default group as current after adding is_current column'
        );
      }
    } catch (e) {
      console.warn('Could not set default group as current:', e);
    }
  }
  if (groupColumnNames.has('description')) {
    try {
      console.log(
        '🛠️ Detected deprecated `description` column on wallpaper_groups, starting migration to remove it'
      );
      const migrateGroups = db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS wallpaper_groups_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            is_default BOOLEAN DEFAULT 0,
            is_current BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL
          );
        `);

        db.exec(`
          INSERT INTO wallpaper_groups_new (id, name, is_default, is_current, created_at, updated_at, deleted_at)
          SELECT id, name, is_default, 0 as is_current, created_at, updated_at, deleted_at FROM wallpaper_groups;
        `);

        db.exec('DROP TABLE wallpaper_groups;');
        db.exec('ALTER TABLE wallpaper_groups_new RENAME TO wallpaper_groups;');

        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_name ON wallpaper_groups(name);'
        );
        db.exec(
          'CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_deleted_at ON wallpaper_groups(deleted_at);'
        );
      });

      migrateGroups();

      console.log(
        '✅ Migration complete: `description` column removed from wallpaper_groups'
      );
    } catch (err) {
      console.error(
        '❌ Failed to migrate wallpaper_groups table to remove description column:',
        err
      );
      throw err;
    }
  }
}

/**
 * Ensure files.type_category allows 'novel'. If the CHECK constraint does not include
 * 'novel', recreate the table with the new constraint and preserve data.
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
    // If table creation SQL contains the CHECK and already includes 'novel', nothing to do
    if (
      /CHECK\s*\(type_category\s+IN/i.test(createSql) &&
      /'novel'/.test(createSql) &&
      /'music'/.test(createSql)
    ) {
      return;
    }

    // Otherwise, recreate the table with the extended CHECK including 'novel' and 'music'
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

/**
 * Ensure apps table has required columns like is_builtin and target_url
 * @param {import('better-sqlite3').Database} db
 */
export function ensureAppsColumns(db) {
  const existingColumns = db.prepare('PRAGMA table_info(apps)').all();
  const existingColumnNames = new Set(existingColumns.map(col => col.name));

  const maybeAddColumn = (name, type) => {
    if (!existingColumnNames.has(name)) {
      db.prepare(`ALTER TABLE apps ADD COLUMN ${name} ${type}`).run();
      console.log(`🛠️ Added column to apps: ${name} ${type}`);
    }
  };

  // 新增 is_builtin（默认 0）以便区分内置应用
  maybeAddColumn('is_builtin', 'INTEGER DEFAULT 0');
  // 新增 target_url（可为 null）用于外部链接应用
  maybeAddColumn('target_url', 'TEXT');
  // 新增 is_autostart（默认 0）支持自启动
  maybeAddColumn('is_autostart', 'INTEGER DEFAULT 0');
}

/**
 * Ensure snake multiplayer tables have expected columns (updated_at, end_reason)
 * and add them if missing. This helps when a fresh DB is created from an
 * older schema or after manual deletion.
 * @param {import('better-sqlite3').Database} db
 */
export function ensureSnakeMultiplayerColumns(db) {
  try {
    // snake_players: ensure updated_at exists
    const playerCols = db.prepare('PRAGMA table_info(snake_players)').all();
    const playerColNames = new Set(playerCols.map(c => c.name));
    if (!playerColNames.has('updated_at')) {
      db.prepare(
        'ALTER TABLE snake_players ADD COLUMN updated_at DATETIME'
      ).run();
      console.log('🛠️ Added column to snake_players: updated_at DATETIME');
    }

    // snake_rooms: ensure updated_at exists
    const roomCols = db.prepare('PRAGMA table_info(snake_rooms)').all();
    const roomColNames = new Set(roomCols.map(c => c.name));
    if (!roomColNames.has('game_type')) {
      db.prepare(
        "ALTER TABLE snake_rooms ADD COLUMN game_type VARCHAR(20) DEFAULT 'snake'"
      ).run();
      console.log(
        "🛠️ Added column to snake_rooms: game_type VARCHAR(20) DEFAULT 'snake'"
      );
    }
    if (!roomColNames.has('updated_at')) {
      db.prepare(
        'ALTER TABLE snake_rooms ADD COLUMN updated_at DATETIME'
      ).run();
      console.log('🛠️ Added column to snake_rooms: updated_at DATETIME');
    }

    // snake_game_records: ensure end_reason exists
    const recordCols = db
      .prepare('PRAGMA table_info(snake_game_records)')
      .all();
    const recordColNames = new Set(recordCols.map(c => c.name));
    if (!recordColNames.has('end_reason')) {
      db.prepare(
        "ALTER TABLE snake_game_records ADD COLUMN end_reason VARCHAR(50) DEFAULT 'finished'"
      ).run();
      console.log(
        "🛠️ Added column to snake_game_records: end_reason VARCHAR(50) DEFAULT 'finished'"
      );
    }
  } catch (err) {
    console.warn(
      'ensureSnakeMultiplayerColumns failed (non-fatal):',
      err && err.message
    );
  }
}

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
