/**
 * Migration: 扩展 files.type_category 支持更多类型
 * 新增: text, code, pdf, ppt, audio
 */

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';

  if (isSqlite) {
    // SQLite 需要重建表来修改 CHECK 约束
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS files_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        type_category TEXT NOT NULL CHECK(type_category IN ('image','video','word','excel','archive','other','novel','music','text','code','pdf','ppt','audio')),
        file_url TEXT NOT NULL,
        uploader_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await knex.raw(`
      INSERT INTO files_new (id, original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id, created_at, updated_at)
      SELECT id, original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id, created_at, updated_at
      FROM files;
    `);

    await knex.raw('DROP TABLE files;');
    await knex.raw('ALTER TABLE files_new RENAME TO files;');

    // 重建索引
    await knex.raw(
      'CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);'
    );
    await knex.raw(
      'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);'
    );
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';

  if (isSqlite) {
    // 回滚时将新类型转换为 'other'
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS files_legacy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        type_category TEXT NOT NULL CHECK(type_category IN ('image','video','word','excel','archive','other','novel','music')),
        file_url TEXT NOT NULL,
        uploader_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await knex.raw(`
      INSERT INTO files_legacy (id, original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id, created_at, updated_at)
      SELECT id, original_name, stored_name, file_path, mime_type, file_size,
        CASE WHEN type_category IN ('text','code','pdf','ppt','audio') THEN 'other' ELSE type_category END,
        file_url, uploader_id, created_at, updated_at
      FROM files;
    `);

    await knex.raw('DROP TABLE files;');
    await knex.raw('ALTER TABLE files_legacy RENAME TO files;');

    await knex.raw(
      'CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);'
    );
    await knex.raw(
      'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);'
    );
  }
}
