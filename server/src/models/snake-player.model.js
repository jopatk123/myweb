/**
 * 贪吃蛇玩家模型
 */
import { getDb } from '../utils/dbPool.js';

export const SnakePlayerModel = {
  /**
   * 创建玩家
   */
  async create(playerData) {
    const db = getDb();
    const [player] = await db('snake_players')
      .insert(playerData)
      .returning('*');
    
    return player;
  },

  /**
   * 根据房间ID和会话ID获取玩家
   */
  async findByRoomAndSession(roomId, sessionId) {
    const db = getDb();
    return await db('snake_players')
      .where({ 
        room_id: roomId, 
        session_id: sessionId 
      })
      .first();
  },

  /**
   * 获取房间内的所有玩家
   */
  async findByRoomId(roomId) {
    const db = getDb();
    return await db('snake_players')
      .where({ room_id: roomId })
      .orderBy('joined_at', 'asc');
  },

  /**
   * 获取房间内的在线玩家
   */
  async findOnlineByRoomId(roomId) {
    const db = getDb();
    return await db('snake_players')
      .where({ 
        room_id: roomId,
        is_online: true 
      })
      .orderBy('joined_at', 'asc');
  },

  /**
   * 更新玩家
   */
  async update(id, updateData) {
    const db = getDb();
    const [player] = await db('snake_players')
      .where({ id })
      .update({
        ...updateData,
        last_active: db.fn.now()
      })
      .returning('*');
    
    return player;
  },

  /**
   * 更新玩家在线状态
   */
  async updateOnlineStatus(sessionId, isOnline) {
    const db = getDb();
    return await db('snake_players')
      .where({ session_id: sessionId })
      .update({ 
        is_online: isOnline,
        last_active: db.fn.now()
      });
  },

  /**
   * 根据会话ID和房间ID更新玩家
   */
  async updateByRoomAndSession(roomId, sessionId, updateData) {
    const db = getDb();
    const [player] = await db('snake_players')
      .where({ 
        room_id: roomId, 
        session_id: sessionId 
      })
      .update({
        ...updateData,
        last_active: db.fn.now()
      })
      .returning('*');
    
    return player;
  },

  /**
   * 删除玩家
   */
  async delete(id) {
    const db = getDb();
    return await db('snake_players')
      .where({ id })
      .del();
  },

  /**
   * 根据会话ID删除玩家
   */
  async deleteBySession(sessionId) {
    const db = getDb();
    return await db('snake_players')
      .where({ session_id: sessionId })
      .del();
  },

  /**
   * 根据房间ID删除所有玩家
   */
  async deleteByRoomId(roomId) {
    const db = getDb();
    return await db('snake_players')
      .where({ room_id: roomId })
      .del();
  },

  /**
   * 获取准备状态的玩家数量
   */
  async getReadyCount(roomId) {
    const db = getDb();
    const result = await db('snake_players')
      .where({ 
        room_id: roomId,
        is_ready: true,
        is_online: true
      })
      .count('id as count')
      .first();
    
    return parseInt(result.count);
  },

  /**
   * 获取房间内玩家数量
   */
  async getPlayerCount(roomId) {
    const db = getDb();
    const result = await db('snake_players')
      .where({ 
        room_id: roomId,
        is_online: true
      })
      .count('id as count')
      .first();
    
    return parseInt(result.count);
  },

  /**
   * 清理离线时间过长的玩家
   */
  async cleanupOfflinePlayers(timeoutMinutes = 10) {
    const db = getDb();
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    
    return await db('snake_players')
      .where('is_online', false)
      .where('last_active', '<', cutoffTime)
      .del();
  }
};
