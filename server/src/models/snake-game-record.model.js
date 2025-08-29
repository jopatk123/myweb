/**
 * 贪吃蛇游戏记录模型
 */
import { getDb } from '../utils/dbPool.js';

export const SnakeGameRecordModel = {
  /**
   * 创建游戏记录
   */
  async create(recordData) {
    const db = getDb();
    const [record] = await db('snake_game_records')
      .insert(recordData)
      .returning('*');
    
    return record;
  },

  /**
   * 根据房间ID获取游戏记录
   */
  async findByRoomId(roomId) {
    const db = getDb();
    return await db('snake_game_records')
      .where({ room_id: roomId })
      .orderBy('created_at', 'desc');
  },

  /**
   * 获取玩家的游戏记录
   */
  async findByPlayer(sessionId, limit = 20) {
    const db = getDb();
    return await db('snake_game_records')
      .where({ winner_session_id: sessionId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  /**
   * 获取玩家统计信息
   */
  async getPlayerStats(sessionId) {
    const db = getDb();
    const stats = await db('snake_game_records')
      .where({ winner_session_id: sessionId })
      .select(
        db.raw('COUNT(*) as total_games'),
        db.raw('COUNT(CASE WHEN winner_session_id = ? THEN 1 END) as wins', [sessionId]),
        db.raw('AVG(winner_score) as avg_score'),
        db.raw('MAX(winner_score) as best_score'),
        db.raw('AVG(game_duration) as avg_duration')
      )
      .first();
    
    return {
      total_games: parseInt(stats.total_games) || 0,
      wins: parseInt(stats.wins) || 0,
      win_rate: stats.total_games > 0 ? (stats.wins / stats.total_games) : 0,
      avg_score: Math.round(stats.avg_score) || 0,
      best_score: parseInt(stats.best_score) || 0,
      avg_duration: Math.round(stats.avg_duration) || 0
    };
  },

  /**
   * 获取排行榜
   */
  async getLeaderboard(mode = null, limit = 10) {
    const db = getDb();
    let query = db('snake_game_records')
      .join('snake_players', 'snake_game_records.winner_session_id', '=', 'snake_players.session_id')
      .select(
        'snake_players.player_name',
        'snake_players.session_id',
        db.raw('COUNT(*) as wins'),
        db.raw('MAX(winner_score) as best_score'),
        db.raw('AVG(winner_score) as avg_score')
      )
      .groupBy('snake_players.session_id', 'snake_players.player_name')
      .orderBy('wins', 'desc')
      .orderBy('best_score', 'desc')
      .limit(limit);
    
    if (mode) {
      query = query.where('snake_game_records.mode', mode);
    }
    
    const results = await query;
    
    return results.map(result => ({
      ...result,
      wins: parseInt(result.wins),
      best_score: parseInt(result.best_score),
      avg_score: Math.round(result.avg_score)
    }));
  },

  /**
   * 删除房间相关的游戏记录
   */
  async deleteByRoomId(roomId) {
    const db = getDb();
    return await db('snake_game_records')
      .where({ room_id: roomId })
      .del();
  }
};
