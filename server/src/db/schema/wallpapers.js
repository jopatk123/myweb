/**
 * Initializes wallpaper-related tables: `wallpaper_groups` and `wallpapers`.
 * Also inserts a default wallpaper group.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initWallpaperTables(db) {
  const groupTableSql = `
    CREATE TABLE IF NOT EXISTS wallpaper_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      is_default BOOLEAN DEFAULT 0,
      is_current BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_name ON wallpaper_groups(name);
    CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_deleted_at ON wallpaper_groups(deleted_at);
  `;

  const wallpaperTableSql = `
    CREATE TABLE IF NOT EXISTS wallpapers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mime_type TEXT,
      group_id INTEGER REFERENCES wallpaper_groups(id) ON DELETE SET NULL,
      name TEXT,
      is_active INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_wallpapers_group_id ON wallpapers(group_id);
    CREATE INDEX IF NOT EXISTS idx_wallpapers_is_active ON wallpapers(is_active);
    CREATE INDEX IF NOT EXISTS idx_wallpapers_deleted_at ON wallpapers(deleted_at);
  `;

  db.exec(groupTableSql);
  db.exec(wallpaperTableSql);

  const insertDefaultGroup = db.prepare(`
    INSERT OR IGNORE INTO wallpaper_groups (name, is_default)
    VALUES (?, ?)
  `);
  insertDefaultGroup.run('默认', 1);

  console.log('📊 Wallpaper tables initialized');
}
