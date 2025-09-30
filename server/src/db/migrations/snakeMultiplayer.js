/**
 * Ensure snake multiplayer tables have expected columns (updated_at, end_reason, game_type).
 * @param {import('better-sqlite3').Database} db
 */
export function ensureSnakeMultiplayerColumns(db) {
  try {
    const playerCols = db.prepare('PRAGMA table_info(snake_players)').all();
    const playerColNames = new Set(playerCols.map(c => c.name));
    if (!playerColNames.has('updated_at')) {
      db.prepare(
        'ALTER TABLE snake_players ADD COLUMN updated_at DATETIME'
      ).run();
      console.log('🛠️ Added column to snake_players: updated_at DATETIME');
    }

    const roomCols = db.prepare('PRAGMA table_info(snake_rooms)').all();
    const roomColNames = new Set(roomCols.map(c => c.name));
    if (!roomColNames.has('game_type')) {
      db.prepare(
        "ALTER TABLE snake_rooms ADD COLUMN game_type VARCHAR(20) DEFAULT 'snake'"
      ).run();
      console.log(
        "🛠️ Added column to snake_rooms: game_type VARCHAR(20) DEFAULT 'snake'"
      );
    }
    if (!roomColNames.has('updated_at')) {
      db.prepare(
        'ALTER TABLE snake_rooms ADD COLUMN updated_at DATETIME'
      ).run();
      console.log('🛠️ Added column to snake_rooms: updated_at DATETIME');
    }

    const recordCols = db
      .prepare('PRAGMA table_info(snake_game_records)')
      .all();
    const recordColNames = new Set(recordCols.map(c => c.name));
    if (!recordColNames.has('end_reason')) {
      db.prepare(
        "ALTER TABLE snake_game_records ADD COLUMN end_reason VARCHAR(50) DEFAULT 'finished'"
      ).run();
      console.log(
        "🛠️ Added column to snake_game_records: end_reason VARCHAR(50) DEFAULT 'finished'"
      );
    }
  } catch (err) {
    console.warn(
      'ensureSnakeMultiplayerColumns failed (non-fatal):',
      err && err.message
    );
  }
}
