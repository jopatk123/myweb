/**
 * 贪吃蛇房间模型
 */
import { getDb } from '../utils/dbPool.js';

export const SnakeRoomModel = {
  /**
   * 创建房间
   */
  create(roomData) {
    const db = getDb();
    
    const gameSettings = typeof roomData.game_settings === 'object' 
      ? JSON.stringify(roomData.game_settings) 
      : roomData.game_settings;
    
    const stmt = db.prepare(`
      INSERT INTO snake_rooms (
        room_code, mode, status, max_players, current_players, 
        created_by, game_settings, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const result = stmt.run(
      roomData.room_code,
      roomData.mode,
      roomData.status || 'waiting',
      roomData.max_players || 8,
      roomData.current_players || 1,
      roomData.created_by,
      gameSettings
    );
    
    // 获取插入的记录
    const room = this.findById(result.lastInsertRowid);
    return room;
  },

  /**
   * 根据房间码获取房间
   */
  findByRoomCode(roomCode) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM snake_rooms WHERE room_code = ?');
    const room = stmt.get(roomCode);
    
    if (room && room.game_settings) {
      room.game_settings = JSON.parse(room.game_settings);
    }
    
    return room;
  },

  /**
   * 根据ID获取房间
   */
  findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM snake_rooms WHERE id = ?');
    const room = stmt.get(id);
    
    if (room && room.game_settings) {
      room.game_settings = JSON.parse(room.game_settings);
    }
    
    return room;
  },

  /**
   * 更新房间
   */
  update(id, updateData) {
    const db = getDb();
    
    const fields = [];
    const values = [];
    
    Object.entries(updateData).forEach(([key, value]) => {
      if (key === 'game_settings' && typeof value === 'object') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE snake_rooms 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.findById(id);
  },

  /**
   * 获取活跃房间列表
   */
  getActiveRooms() {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM snake_rooms 
      WHERE status IN ('waiting', 'playing') 
      ORDER BY created_at DESC
    `);
    
    const rooms = stmt.all();
    
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
  delete(id) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM snake_rooms WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * 生成唯一房间码
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let roomCode;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      roomCode = '';
      for (let i = 0; i < 6; i++) {
        roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const existing = this.findByRoomCode(roomCode);
      if (!existing) {
        return roomCode;
      }
      
      attempts++;
    } while (attempts < maxAttempts);
    
    throw new Error('Failed to generate unique room code');
  }
};
