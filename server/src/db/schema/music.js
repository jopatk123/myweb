/**
 * Initializes music tracks table.
 * @param {import('better-sqlite3').Database} db
 */
export function initMusicTables(db) {
  const musicTableSql = `
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_music_tracks_file_id ON music_tracks(file_id);
    CREATE INDEX IF NOT EXISTS idx_music_tracks_created_at ON music_tracks(created_at);
    CREATE INDEX IF NOT EXISTS idx_music_tracks_title ON music_tracks(title);
    CREATE INDEX IF NOT EXISTS idx_music_tracks_artist ON music_tracks(artist);
  `;

  db.exec(musicTableSql);
  console.log('🎵 Music tracks table initialized');
}
