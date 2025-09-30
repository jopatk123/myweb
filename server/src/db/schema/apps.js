/**
 * Initializes app-related tables: `app_groups` and `apps`.
 * Also inserts a default app group.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initAppTables(db) {
  const appGroupTableSql = `
    CREATE TABLE IF NOT EXISTS app_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(100) UNIQUE,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_app_groups_name ON app_groups(name);
    CREATE INDEX IF NOT EXISTS idx_app_groups_deleted_at ON app_groups(deleted_at);
  `;

  const appsTableSql = `
    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon_filename TEXT,
      group_id INTEGER REFERENCES app_groups(id) ON DELETE SET NULL,
      is_visible INTEGER DEFAULT 1,
      is_autostart INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      is_builtin INTEGER DEFAULT 0,
      target_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_apps_group_id ON apps(group_id);
    CREATE INDEX IF NOT EXISTS idx_apps_is_visible ON apps(is_visible);
    CREATE INDEX IF NOT EXISTS idx_apps_is_autostart ON apps(is_autostart);
    CREATE INDEX IF NOT EXISTS idx_apps_is_deleted ON apps(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
  `;

  db.exec(appGroupTableSql);
  db.exec(appsTableSql);

  const insertDefaultAppGroup = db.prepare(`
    INSERT OR IGNORE INTO app_groups (name, slug, is_default)
    VALUES (?, ?, ?)
  `);
  insertDefaultAppGroup.run('默认', 'default', 1);

  console.log('📊 App tables initialized');
}
