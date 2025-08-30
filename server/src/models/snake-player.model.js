/**
 * 贪吃蛇玩家模型
 */
import { getDb } from '../utils/dbPool.js';

export const SnakePlayerModel = {
  /**
   * 创建玩家
   */
  create(playerData) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO snake_players (
        room_id, session_id, player_name, player_color, 
        is_ready, is_online, joined_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const result = stmt.run(
      playerData.room_id,
      playerData.session_id,
      playerData.player_name,
      playerData.player_color,
      playerData.is_ready ? 1 : 0,
      playerData.is_online !== false ? 1 : 0 // 默认为true
    );
    
    return this.findById(result.lastInsertRowid);
  },

  /**
   * 根据ID获取玩家
   */
  findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM snake_players WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    row.is_ready = !!row.is_ready;
    row.is_online = !!row.is_online;
    return row;
  },

  /**
   * 根据房间ID和会话ID获取玩家
   */
  findByRoomAndSession(roomId, sessionId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM snake_players 
      WHERE room_id = ? AND session_id = ?
    `);
    const row = stmt.get(roomId, sessionId);
    if (!row) return null;
    row.is_ready = !!row.is_ready;
    row.is_online = !!row.is_online;
    return row;
  },

  /**
   * 获取房间内的所有玩家
   */
  findByRoomId(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM snake_players 
      WHERE room_id = ? 
      ORDER BY joined_at ASC
    `);
    const rows = stmt.all(roomId);
    return rows.map(r => ({
      ...r,
      is_ready: !!r.is_ready,
      is_online: !!r.is_online
    }));
  },

  /**
   * 获取房间内的在线玩家
   */
  findOnlineByRoomId(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM snake_players 
      WHERE room_id = ? AND is_online = 1 
      ORDER BY joined_at ASC
    `);
    const rows = stmt.all(roomId);
    return rows.map(r => ({
      ...r,
      is_ready: !!r.is_ready,
      is_online: !!r.is_online
    }));
  },

  /**
   * 更新玩家信息
   */
  update(id, updateData) {
    const db = getDb();
    
    const fields = [];
    const values = [];
    
    Object.entries(updateData).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      // 转换布尔值为数字
      if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    });
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE snake_players 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    
    try {
      stmt.run(...values);
    } catch (e) {
      console.error('Failed to update snake_player id=', id, 'fields=', fields.join(', '), 'error=', e && e.message);
      throw e;
    }
    return this.findById(id);
  },

  /**
   * 根据房间ID和会话ID更新玩家
   */
  updateByRoomAndSession(roomId, sessionId, updateData) {
    const db = getDb();
    
    const fields = [];
    const values = [];
    
    Object.entries(updateData).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      // 转换布尔值为数字
      if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    });
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(roomId, sessionId);
    
    const stmt = db.prepare(`
      UPDATE snake_players 
      SET ${fields.join(', ')} 
      WHERE room_id = ? AND session_id = ?
    `);
    
    try {
      stmt.run(...values);
    } catch (e) {
      console.error('Failed to update snake_player by room/session', { roomId, sessionId, fields: fields.join(', '), error: e && e.message });
      throw e;
    }
    return this.findByRoomAndSession(roomId, sessionId);
  },

  /**
   * 获取房间内玩家数量
   */
  getPlayerCount(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM snake_players 
      WHERE room_id = ? AND is_online = 1
    `);
    const result = stmt.get(roomId);
    return result.count;
  },

  /**
   * 获取房间内准备的玩家数量
   */
  getReadyCount(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM snake_players 
      WHERE room_id = ? AND is_ready = 1 AND is_online = 1
    `);
    const result = stmt.get(roomId);
    return result.count;
  },

  /**
   * 删除玩家（根据会话ID）
   */
  deleteBySession(sessionId) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM snake_players WHERE session_id = ?');
    return stmt.run(sessionId);
  },

  /**
   * 删除房间内所有玩家
   */
  deleteByRoomId(roomId) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM snake_players WHERE room_id = ?');
    return stmt.run(roomId);
  },

  /**
   * 清理离线玩家
   */
  cleanupOfflinePlayers(timeoutMinutes = 10) {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM snake_players 
      WHERE is_online = 0 
      AND updated_at < datetime('now', '-${timeoutMinutes} minutes')
    `);
    const result = stmt.run();
    return result.changes;
  }
};