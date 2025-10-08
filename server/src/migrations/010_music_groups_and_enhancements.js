/**
 * Migration 010: introduce music groups, track metadata enhancements, and compression info.
 */
export const up = async knex => {
  const hasMusicGroups = await knex.schema.hasTable('music_groups');
  if (!hasMusicGroups) {
    await knex.schema.createTable('music_groups', table => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.boolean('is_default').notNullable().defaultTo(false);
      table.timestamps(true, true);
      table.timestamp('deleted_at');
    });
  }

  const defaultGroup = await knex('music_groups')
    .where({ is_default: true })
    .first();

  let defaultGroupId = defaultGroup?.id;
  if (!defaultGroupId) {
    const inserted = await knex('music_groups').insert(
      { name: '默认歌单', is_default: true },
      ['id']
    );
    defaultGroupId = Array.isArray(inserted)
      ? (inserted[0]?.id ?? inserted[0])
      : inserted;
  }

  const hasGroupIdColumn = await knex.schema.hasColumn(
    'music_tracks',
    'group_id'
  );
  if (!hasGroupIdColumn) {
    await knex.schema.alterTable('music_tracks', table => {
      table
        .integer('group_id')
        .nullable()
        .references('id')
        .inTable('music_groups')
        .onDelete('SET NULL');
    });
    await knex('music_tracks')
      .whereNull('group_id')
      .update({ group_id: defaultGroupId });
    await knex.schema.alterTable('music_tracks', table => {
      table.index(['group_id'], 'idx_music_tracks_group_id');
    });
  }

  const extraColumns = [
    { key: 'compression_strategy', type: 'string' },
    { key: 'original_bitrate', type: 'integer' },
    { key: 'transcode_profile', type: 'string' },
  ];

  for (const column of extraColumns) {
    const exists = await knex.schema.hasColumn('music_tracks', column.key);
    if (!exists) {
      await knex.schema.alterTable('music_tracks', table => {
        if (column.type === 'string') {
          table.string(column.key);
        } else if (column.type === 'integer') {
          table.integer(column.key);
        }
      });
    }
  }
};

export const down = async knex => {
  const hasMusicTracks = await knex.schema.hasTable('music_tracks');
  if (hasMusicTracks) {
    const tempTable = 'music_tracks_rollback_010';
    await knex.transaction(async trx => {
      await trx.raw(`
        CREATE TABLE IF NOT EXISTS ${tempTable} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          artist TEXT,
          album TEXT,
          genre TEXT,
          duration_seconds INTEGER,
          bitrate INTEGER,
          sample_rate INTEGER,
          track_number INTEGER,
          disc_number INTEGER,
          year INTEGER,
          original_name TEXT NOT NULL,
          stored_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          mime_type TEXT,
          file_size INTEGER,
          file_url TEXT,
          uploader_id TEXT,
          file_id INTEGER UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        );
      `);

      await trx.raw(`
        INSERT INTO ${tempTable} (
          id,
          title,
          artist,
          album,
          genre,
          duration_seconds,
          bitrate,
          sample_rate,
          track_number,
          disc_number,
          year,
          original_name,
          stored_name,
          file_path,
          mime_type,
          file_size,
          file_url,
          uploader_id,
          file_id,
          created_at,
          updated_at
        )
        SELECT
          id,
          title,
          artist,
          album,
          genre,
          duration_seconds,
          bitrate,
          sample_rate,
          track_number,
          disc_number,
          year,
          original_name,
          stored_name,
          file_path,
          mime_type,
          file_size,
          file_url,
          uploader_id,
          file_id,
          created_at,
          updated_at
        FROM music_tracks;
      `);

      await trx.raw('DROP TABLE music_tracks;');
      await trx.raw(`ALTER TABLE ${tempTable} RENAME TO music_tracks;`);
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_music_tracks_file_id ON music_tracks(file_id);'
      );
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_music_tracks_created_at ON music_tracks(created_at);'
      );
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_music_tracks_title ON music_tracks(title);'
      );
      await trx.raw(
        'CREATE INDEX IF NOT EXISTS idx_music_tracks_artist ON music_tracks(artist);'
      );
    });
  }

  const hasMusicGroups = await knex.schema.hasTable('music_groups');
  if (hasMusicGroups) {
    await knex.schema.dropTable('music_groups');
  }
};
