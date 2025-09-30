/**
 * Ensure apps table has required columns like is_builtin and target_url.
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

  maybeAddColumn('is_builtin', 'INTEGER DEFAULT 0');
  maybeAddColumn('target_url', 'TEXT');
  maybeAddColumn('is_autostart', 'INTEGER DEFAULT 0');
}
