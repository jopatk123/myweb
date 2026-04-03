/**
 * Ensure apps table has required columns.
 * @param {import('better-sqlite3').Database} db
 */
import logger from '../../utils/logger.js';

const migrationLogger = logger.child('AppsMigration');

export function ensureAppsColumns(db) {
  const existingColumns = db.prepare('PRAGMA table_info(apps)').all();
  const existingColumnNames = new Set(existingColumns.map(col => col.name));

  const maybeAddColumn = (name, type) => {
    if (!existingColumnNames.has(name)) {
      db.prepare(`ALTER TABLE apps ADD COLUMN ${name} ${type}`).run();
      migrationLogger.info(`Added column to apps: ${name} ${type}`);
    }
  };

  maybeAddColumn('is_builtin', 'INTEGER DEFAULT 0');
  maybeAddColumn('target_url', 'TEXT');
  maybeAddColumn('is_autostart', 'INTEGER DEFAULT 0');

  // 统一软删除策略：从 is_deleted 迁移到 deleted_at
  maybeAddColumn('deleted_at', 'DATETIME DEFAULT NULL');

  // 将存量 is_deleted=1 的记录回填 deleted_at（仅当旧列存在时才需要）
  if (
    !existingColumnNames.has('deleted_at') &&
    existingColumnNames.has('is_deleted')
  ) {
    db.prepare(
      `UPDATE apps SET deleted_at = CURRENT_TIMESTAMP WHERE is_deleted = 1 AND deleted_at IS NULL`
    ).run();
    migrationLogger.info(
      'Backfilled deleted_at from is_deleted for existing soft-deleted apps'
    );
  }
}
