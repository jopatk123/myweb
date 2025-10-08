/**
 * Initializes music tracks table.
 * @param {import('better-sqlite3').Database} db
 */
export function initMusicTables(db) {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS music_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS music_tracks (
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
      group_id INTEGER,
      compression_strategy TEXT,
      original_bitrate INTEGER,
      transcode_profile TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES music_groups(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_music_tracks_file_id ON music_tracks(file_id);
    CREATE INDEX IF NOT EXISTS idx_music_tracks_created_at ON music_tracks(created_at);
    CREATE INDEX IF NOT EXISTS idx_music_tracks_title ON music_tracks(title);
    CREATE INDEX IF NOT EXISTS idx_music_tracks_artist ON music_tracks(artist);
    CREATE INDEX IF NOT EXISTS idx_music_tracks_group_id ON music_tracks(group_id);
  `;

  db.exec(schemaSql);
  const defaultStmt = db.prepare(
    'INSERT INTO music_groups (name, is_default) SELECT ?, 1 WHERE NOT EXISTS (SELECT 1 FROM music_groups WHERE is_default = 1)'
  );
  defaultStmt.run('默认歌单');
  console.log('🎵 Music tracks table initialized');
}
