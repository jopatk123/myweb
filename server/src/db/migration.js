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

      // 创建新表（不包含 description）
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

      // 将存在的数据（除 description 外）复制到新表
      db.exec(`
        INSERT INTO wallpapers_new (id, mime_type, group_id, name, is_active, deleted_at, created_at, updated_at, filename, original_name, file_path, file_size)
        SELECT id, mime_type, group_id, name, is_active, deleted_at, created_at, updated_at, filename, original_name, file_path, file_size FROM wallpapers;
      `);

      // 删除旧表并重命名
      db.exec('DROP TABLE wallpapers;');
      db.exec('ALTER TABLE wallpapers_new RENAME TO wallpapers;');

      // 重新创建索引
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpapers_group_id ON wallpapers(group_id);'
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpapers_is_active ON wallpapers(is_active);'
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpapers_deleted_at ON wallpapers(deleted_at);'
      );

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
      /'novel'/.test(createSql)
    ) {
      return;
    }

    // Otherwise, recreate the table with the extended CHECK including 'novel'
    console.log(
      '🛠️ Migrating files table to include \u2018novel\u2019 in type_category CHECK'
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS files_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        type_category TEXT NOT NULL CHECK(type_category IN ('image','video','word','excel','archive','other','novel')),
        file_url TEXT,
        uploader_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Copy existing rows, normalizing missing type_category to 'other'
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

    // Recreate indices
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);'
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);'
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);'
    );

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
}
