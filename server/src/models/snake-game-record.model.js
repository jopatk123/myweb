/**
 * 贪吃蛇游戏记录模型
 */
import { getDb } from '../utils/dbPool.js';

export const SnakeGameRecordModel = {
  /**
   * 创建游戏记录
  /**
   * 贪吃蛇游戏记录模型
   */
  import { getDb } from '../utils/dbPool.js';

  export const SnakeGameRecordModel = {
    /**
     * 创建游戏记录
     */
    create(recordData) {
      const db = getDb();
      const stmt = db.prepare(`
        INSERT INTO snake_game_records (
          room_id, mode, winner_session_id, winner_score, 
          game_duration, end_reason, player_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
    
      const result = stmt.run(
        recordData.room_id,
        recordData.mode,
        recordData.winner_session_id,
        recordData.winner_score || 0,
        recordData.game_duration || 0,
        recordData.end_reason || 'finished',
        recordData.player_count || 1
      );
    
      return this.findById(result.lastInsertRowid);
    },

    /**
     * 根据ID获取记录
     */
    findById(id) {
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM snake_game_records WHERE id = ?');
      return stmt.get(id);
    },

    /**
     * 根据房间ID获取游戏记录
     */
    findByRoomId(roomId) {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT * FROM snake_game_records 
        WHERE room_id = ? 
        ORDER BY created_at DESC
      `);
      return stmt.all(roomId);
    },

    /**
     * 获取玩家的游戏记录
     */
    findByPlayer(sessionId, limit = 10) {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT * FROM snake_game_records 
        WHERE winner_session_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      return stmt.all(sessionId, limit);
    }
  };