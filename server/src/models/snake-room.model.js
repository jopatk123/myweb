/**
 * 贪吃蛇房间模型
 */
import { getDb } from '../utils/dbPool.js';

export const SnakeRoomModel = {
  /**
   * 创建房间
   */
  async create(roomData) {
    const db = getDb();
    const [room] = await db('snake_rooms')
      .insert({
        ...roomData,
        game_settings: typeof roomData.game_settings === 'object' 
          ? JSON.stringify(roomData.game_settings) 
          : roomData.game_settings
      })
      .returning('*');
    
    if (room.game_settings) {
      room.game_settings = JSON.parse(room.game_settings);
    }
    
    return room;
  },

  /**
   * 根据房间码获取房间
   */
  async findByRoomCode(roomCode) {
    const db = getDb();
    const room = await db('snake_rooms')
      .where({ room_code: roomCode })
      .first();
    
    if (room && room.game_settings) {
      room.game_settings = JSON.parse(room.game_settings);
    }
    
    return room;
  },

  /**
   * 根据ID获取房间
   */
  async findById(id) {
    const db = getDb();
    const room = await db('snake_rooms')
      .where({ id })
      .first();
    
    if (room && room.game_settings) {
      room.game_settings = JSON.parse(room.game_settings);
    }
    
    return room;
  },

  /**
   * 更新房间
   */
  async update(id, updateData) {
    const db = getDb();
    if (updateData.game_settings && typeof updateData.game_settings === 'object') {
      updateData.game_settings = JSON.stringify(updateData.game_settings);
    }
    
    const [room] = await db('snake_rooms')
      .where({ id })
      .update({
        ...updateData,
        updated_at: db.fn.now()
      })
      .returning('*');
    
    if (room && room.game_settings) {
      room.game_settings = JSON.parse(room.game_settings);
    }
    
    return room;
  },

  /**
   * 获取活跃房间列表
   */
  async getActiveRooms() {
    const db = getDb();
    const rooms = await db('snake_rooms')
      .where('status', 'in', ['waiting', 'playing'])
      .orderBy('created_at', 'desc');
    
    return rooms.map(room => {
      if (room.game_settings) {
        room.game_settings = JSON.parse(room.game_settings);
      }
      return room;
    });
  },

  /**
   * 删除房间
   */
  async delete(id) {
    const db = getDb();
    return await db('snake_rooms')
      .where({ id })
      .del();
  },

  /**
   * 生成唯一房间码
   */
  async generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let roomCode;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      roomCode = '';
      for (let i = 0; i < 6; i++) {
        roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const existing = await this.findByRoomCode(roomCode);
      if (!existing) {
        return roomCode;
      }
      
      attempts++;
    } while (attempts < maxAttempts);
    
    throw new Error('Failed to generate unique room code');
  }
};
