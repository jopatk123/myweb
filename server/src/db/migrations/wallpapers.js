/**
 * Ensure wallpapers table has required columns and perform migrations to remove deprecated columns.
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

  maybeAddColumn('filename', 'TEXT');
  maybeAddColumn('original_name', 'TEXT');
  maybeAddColumn('file_path', 'TEXT');
  maybeAddColumn('file_size', 'INTEGER');
  maybeAddColumn('name', 'TEXT');

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

  const groupColumns = db.prepare('PRAGMA table_info(wallpaper_groups)').all();
  const groupColumnNames = new Set(groupColumns.map(col => col.name));

  if (!groupColumnNames.has('is_current')) {
    db.prepare(
      'ALTER TABLE wallpaper_groups ADD COLUMN is_current BOOLEAN DEFAULT 0'
    ).run();
    console.log(
      '🛠️ Added column to wallpaper_groups: is_current BOOLEAN DEFAULT 0'
    );
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
