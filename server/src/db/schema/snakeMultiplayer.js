/**
 * Initializes snake multiplayer tables.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initSnakeMultiplayerTables(db) {
  const snakeRoomsTableSql = `
    CREATE TABLE IF NOT EXISTS snake_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code VARCHAR(10) UNIQUE NOT NULL,
      mode VARCHAR(20) NOT NULL DEFAULT 'shared',
      game_type VARCHAR(20) NOT NULL DEFAULT 'snake',
      max_players INTEGER DEFAULT 8,
      current_players INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'waiting',
      created_by VARCHAR(36) NOT NULL,
      game_settings TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_snake_rooms_room_code ON snake_rooms(room_code);
    CREATE INDEX IF NOT EXISTS idx_snake_rooms_status ON snake_rooms(status);
    CREATE INDEX IF NOT EXISTS idx_snake_rooms_created_by ON snake_rooms(created_by);
  `;

  const snakePlayersTableSql = `
    CREATE TABLE IF NOT EXISTS snake_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      session_id VARCHAR(36) NOT NULL,
      player_name VARCHAR(50) NOT NULL,
      player_color VARCHAR(7) DEFAULT '#007bff',
      is_ready BOOLEAN DEFAULT 0,
      is_online BOOLEAN DEFAULT 1,
      score INTEGER DEFAULT 0,
      snake_length INTEGER DEFAULT 3,
      last_vote VARCHAR(10),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES snake_rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snake_players_room_session ON snake_players(room_id, session_id);
    CREATE INDEX IF NOT EXISTS idx_snake_players_is_online ON snake_players(is_online);
  `;

  const snakeGameRecordsTableSql = `
    CREATE TABLE IF NOT EXISTS snake_game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      mode VARCHAR(20) NOT NULL,
      winner_session_id VARCHAR(36),
      winner_score INTEGER DEFAULT 0,
      game_duration INTEGER DEFAULT 0,
      end_reason VARCHAR(50) DEFAULT 'finished',
      player_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES snake_rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snake_game_records_room_id ON snake_game_records(room_id);
    CREATE INDEX IF NOT EXISTS idx_snake_game_records_winner ON snake_game_records(winner_session_id);
    CREATE INDEX IF NOT EXISTS idx_snake_game_records_mode ON snake_game_records(mode);
  `;

  db.exec(snakeRoomsTableSql);
  db.exec(snakePlayersTableSql);
  db.exec(snakeGameRecordsTableSql);

  console.log('🐍 Snake multiplayer tables initialized');
}
