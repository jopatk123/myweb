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
  },

  /**
   * 获取玩家统计信息
   */
  getPlayerStats(sessionId) {
    const db = getDb();
    
    // 获取总游戏数
    const totalGamesStmt = db.prepare(`
      SELECT COUNT(*) as total_games 
      FROM snake_game_records 
      WHERE winner_session_id = ?
    `);
    const totalGames = totalGamesStmt.get(sessionId);
    
    // 获取胜利数（在共享模式中，所有玩家都是获胜者）
    const winsStmt = db.prepare(`
      SELECT COUNT(*) as wins 
      FROM snake_game_records 
      WHERE winner_session_id = ?
    `);
    const wins = winsStmt.get(sessionId);
    
    // 获取最高分
    const highScoreStmt = db.prepare(`
      SELECT MAX(winner_score) as high_score 
      FROM snake_game_records 
      WHERE winner_session_id = ?
    `);
    const highScore = highScoreStmt.get(sessionId);
    
    // 获取平均分
    const avgScoreStmt = db.prepare(`
      SELECT AVG(winner_score) as avg_score 
      FROM snake_game_records 
      WHERE winner_session_id = ?
    `);
    const avgScore = avgScoreStmt.get(sessionId);
    
    return {
      total_games: totalGames.total_games || 0,
      wins: wins.wins || 0,
      high_score: highScore.high_score || 0,
      avg_score: Math.round(avgScore.avg_score || 0)
    };
  },

  /**
   * 获取排行榜
   */
  getLeaderboard(mode = null, limit = 10) {
    const db = getDb();
    
    let query = `
      SELECT 
        winner_session_id,
        MAX(winner_score) as best_score,
        COUNT(*) as games_played,
        AVG(winner_score) as avg_score
      FROM snake_game_records 
    `;
    
    const params = [];
    
    if (mode) {
      query += ' WHERE mode = ?';
      params.push(mode);
    }
    
    query += `
      GROUP BY winner_session_id 
      ORDER BY best_score DESC 
      LIMIT ?
    `;
    params.push(limit);
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
};