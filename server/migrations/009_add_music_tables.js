/**
 * Migration: 添加音乐播放器所需的数据表，并扩展 files.type_category 支持 music
 */
export const up = async knex => {
  // 创建 music_tracks 表（若不存在）
  const hasMusicTable = await knex.schema.hasTable('music_tracks');
  if (!hasMusicTable) {
    await knex.schema.createTable('music_tracks', table => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.string('artist');
      table.string('album');
      table.string('genre');
      table.integer('duration_seconds');
      table.integer('bitrate');
      table.integer('sample_rate');
      table.integer('track_number');
      table.integer('disc_number');
      table.integer('year');
      table.string('original_name').notNullable();
      table.string('stored_name').notNullable();
      table.string('file_path').notNullable();
      table.string('mime_type');
      table.bigInteger('file_size');
      table.string('file_url');
      table.string('uploader_id');
      table
        .integer('file_id')
        .unique()
        .notNullable()
        .references('id')
        .inTable('files')
        .onDelete('CASCADE');
      table.timestamps(true, true);
    });

    await knex.schema.alterTable('music_tracks', table => {
      table.index(['file_id'], 'idx_music_tracks_file_id');
      table.index(['created_at'], 'idx_music_tracks_created_at');
      table.index(['title'], 'idx_music_tracks_title');
      table.index(['artist'], 'idx_music_tracks_artist');
    });
  }

  // 扩展 files.type_category CHECK 约束，包含 music
  const result = await knex.raw(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='files'"
  );
  const createSql = result?.[0]?.sql || result?.sql || '';
  if (!/'music'/.test(createSql)) {
    await knex.transaction(async trx => {
      await trx.raw(`
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

      await trx.raw(`
        INSERT INTO files_new (id, original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id, created_at, updated_at)
        SELECT id, original_name, stored_name, file_path, mime_type, file_size,
          CASE WHEN type_category IS NULL OR type_category = '' THEN 'other' ELSE type_category END,
          file_url, uploader_id, created_at, updated_at
        FROM files;
      `);

      await trx.raw('DROP TABLE files;');
      await trx.raw('ALTER TABLE files_new RENAME TO files;');
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);'
      );
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);'
      );
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);'
      );
    });
  }
};

export const down = async knex => {
  const hasMusicTable = await knex.schema.hasTable('music_tracks');
  if (hasMusicTable) {
    await knex.schema.dropTableIfExists('music_tracks');
  }

  const result = await knex.raw(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='files'"
  );
  const createSql = result?.[0]?.sql || result?.sql || '';
  if (/'music'/.test(createSql)) {
    await knex.transaction(async trx => {
      await trx.raw(`
        CREATE TABLE IF NOT EXISTS files_legacy (
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

      await trx.raw(`
        INSERT INTO files_legacy (id, original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id, created_at, updated_at)
        SELECT id, original_name, stored_name, file_path, mime_type, file_size,
          CASE WHEN type_category = 'music' THEN 'other' ELSE type_category END,
          file_url, uploader_id, created_at, updated_at
        FROM files;
      `);

      await trx.raw('DROP TABLE files;');
      await trx.raw('ALTER TABLE files_legacy RENAME TO files;');
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);'
      );
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);'
      );
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);'
      );
    });
  }
};
