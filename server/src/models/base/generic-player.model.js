/**
 * 通用玩家数据模型
 * 提供基础的玩家管理功能，支持多种游戏类型
 */
import { getDb } from '../../utils/dbPool.js';
import { AbstractPlayerModel } from '../../services/multiplayer/abstract-models.js';

export class GenericPlayerModel extends AbstractPlayerModel {
  constructor(tableName = 'game_players', options = {}) {
    super();
    this.tableName = tableName;
    this.options = {
      enableSoftDelete: false,
      trackLastActive: true,
      enableStats: true,
      ...options
    };
  }

  /**
   * 创建玩家
   * @param {object} playerData - 玩家数据
   * @returns {object} 创建的玩家
   */
  static create(playerData) {
    const db = getDb();
    
    const gameData = typeof playerData.game_data === 'object' 
      ? JSON.stringify(playerData.game_data) 
      : playerData.game_data;
    
    const stmt = db.prepare(`
      INSERT INTO ${this.getTableName()} (
        room_id, session_id, player_name, player_color, is_ready, is_online,
        score, game_data, joined_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      playerData.room_id,
      playerData.session_id,
      playerData.player_name,
      playerData.player_color || '#007bff',
      playerData.is_ready || false,
      playerData.is_online !== false, // 默认在线
      playerData.score || 0,
      gameData || null
    );
    
    return this.findById(result.lastInsertRowid);
  }

  /**
   * 根据ID查找玩家
   * @param {number} playerId - 玩家ID
   * @returns {object|null} 玩家对象
   */
  static findById(playerId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `);
    const player = stmt.get(playerId);
    return player ? this.parsePlayer(player) : null;
  }

  /**
   * 根据房间ID和会话ID查找玩家
   * @param {number} roomId - 房间ID
   * @param {string} sessionId - 会话ID
   * @returns {object|null} 玩家对象
   */
  static findByRoomAndSession(roomId, sessionId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE room_id = ? AND session_id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `);
    const player = stmt.get(roomId, sessionId);
    return player ? this.parsePlayer(player) : null;
  }

  /**
   * 根据房间ID查找所有玩家
   * @param {number} roomId - 房间ID
   * @returns {Array} 玩家列表
   */
  static findByRoomId(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE room_id = ? AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY joined_at ASC
    `);
    const players = stmt.all(roomId);
    return players.map(player => this.parsePlayer(player));
  }

  /**
   * 根据房间ID查找在线玩家
   * @param {number} roomId - 房间ID
   * @returns {Array} 在线玩家列表
   */
  static findOnlineByRoomId(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE room_id = ? AND is_online = 1 AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY joined_at ASC
    `);
    const players = stmt.all(roomId);
    return players.map(player => this.parsePlayer(player));
  }

  /**
   * 根据会话ID查找玩家
   * @param {string} sessionId - 会话ID
   * @returns {Array} 玩家列表
   */
  static findBySessionId(sessionId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE session_id = ? AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY joined_at DESC
    `);
    const players = stmt.all(sessionId);
    return players.map(player => this.parsePlayer(player));
  }

  /**
   * 更新玩家信息
   * @param {number} playerId - 玩家ID
   * @param {object} updates - 更新数据
   * @returns {boolean} 更新是否成功
   */
  static update(playerId, updates) {
    const db = getDb();
    
    // 构建动态更新语句
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'game_data' && typeof value === 'object') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    // 自动更新最后活跃时间
    if (this.options.trackLastActive && !updates.last_active) {
      fields.push('last_active = datetime(\'now\')');
    }
    
    values.push(playerId);
    
    const stmt = db.prepare(`
      UPDATE ${this.getTableName()} 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * 根据会话ID删除玩家
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 删除是否成功
   */
  static deleteBySession(sessionId) {
    const db = getDb();
    
    if (this.options.enableSoftDelete) {
      // 软删除
      const stmt = db.prepare(`
        UPDATE ${this.getTableName()} 
        SET deleted_at = datetime('now'), is_online = 0
        WHERE session_id = ?
      `);
      const result = stmt.run(sessionId);
      return result.changes > 0;
    } else {
      // 硬删除
      const stmt = db.prepare(`DELETE FROM ${this.getTableName()} WHERE session_id = ?`);
      const result = stmt.run(sessionId);
      return result.changes > 0;
    }
  }

  /**
   * 根据房间ID删除所有玩家
   * @param {number} roomId - 房间ID
   * @returns {boolean} 删除是否成功
   */
  static deleteByRoomId(roomId) {
    const db = getDb();
    
    if (this.options.enableSoftDelete) {
      // 软删除
      const stmt = db.prepare(`
        UPDATE ${this.getTableName()} 
        SET deleted_at = datetime('now'), is_online = 0
        WHERE room_id = ?
      `);
      const result = stmt.run(roomId);
      return result.changes > 0;
    } else {
      // 硬删除
      const stmt = db.prepare(`DELETE FROM ${this.getTableName()} WHERE room_id = ?`);
      const result = stmt.run(roomId);
      return result.changes > 0;
    }
  }

  /**
   * 根据ID删除玩家
   * @param {number} playerId - 玩家ID
   * @returns {boolean} 删除是否成功
   */
  static deleteById(playerId) {
    const db = getDb();
    
    if (this.options.enableSoftDelete) {
      // 软删除
      const stmt = db.prepare(`
        UPDATE ${this.getTableName()} 
        SET deleted_at = datetime('now'), is_online = 0
        WHERE id = ?
      `);
      const result = stmt.run(playerId);
      return result.changes > 0;
    } else {
      // 硬删除
      const stmt = db.prepare(`DELETE FROM ${this.getTableName()} WHERE id = ?`);
      const result = stmt.run(playerId);
      return result.changes > 0;
    }
  }

  /**
   * 获取房间内玩家数量
   * @param {number} roomId - 房间ID
   * @param {boolean} onlineOnly - 是否只统计在线玩家
   * @returns {number} 玩家数量
   */
  static getPlayerCount(roomId, onlineOnly = true) {
    const db = getDb();
    
    let whereClause = 'room_id = ? AND (deleted_at IS NULL OR deleted_at = \'\')';
    if (onlineOnly) {
      whereClause += ' AND is_online = 1';
    }
    
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM ${this.getTableName()} 
      WHERE ${whereClause}
    `);
    
    const result = stmt.get(roomId);
    return result.count;
  }

  /**
   * 获取准备就绪的玩家数量
   * @param {number} roomId - 房间ID
   * @returns {number} 准备就绪的玩家数量
   */
  static getReadyPlayerCount(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM ${this.getTableName()} 
      WHERE room_id = ? AND is_ready = 1 AND is_online = 1 
        AND (deleted_at IS NULL OR deleted_at = '')
    `);
    const result = stmt.get(roomId);
    return result.count;
  }

  /**
   * 设置所有玩家的准备状态
   * @param {number} roomId - 房间ID
   * @param {boolean} isReady - 准备状态
   * @returns {number} 受影响的行数
   */
  static setAllPlayersReady(roomId, isReady = false) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${this.getTableName()} 
      SET is_ready = ?, last_active = datetime('now')
      WHERE room_id = ? AND is_online = 1 AND (deleted_at IS NULL OR deleted_at = '')
    `);
    const result = stmt.run(isReady ? 1 : 0, roomId);
    return result.changes;
  }

  /**
   * 更新玩家在线状态
   * @param {string} sessionId - 会话ID
   * @param {boolean} isOnline - 在线状态
   * @returns {boolean} 更新是否成功
   */
  static updateOnlineStatus(sessionId, isOnline = true) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${this.getTableName()} 
      SET is_online = ?, last_active = datetime('now')
      WHERE session_id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `);
    const result = stmt.run(isOnline ? 1 : 0, sessionId);
    return result.changes > 0;
  }

  /**
   * 获取玩家统计信息
   * @param {string} sessionId - 会话ID
   * @param {object} filters - 过滤条件
   * @returns {object} 统计信息
   */
  static getPlayerStats(sessionId, filters = {}) {
    const db = getDb();
    
    let whereClause = 'session_id = ? AND (deleted_at IS NULL OR deleted_at = \'\')';
    const params = [sessionId];
    
    if (filters.game_type) {
      // 这里需要关联房间表获取游戏类型
      // 简化版本，假设有 game_type 字段
      whereClause += ' AND game_type = ?';
      params.push(filters.game_type);
    }
    
    if (filters.date_from) {
      whereClause += ' AND joined_at >= ?';
      params.push(filters.date_from);
    }
    
    if (filters.date_to) {
      whereClause += ' AND joined_at <= ?';
      params.push(filters.date_to);
    }
    
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_games,
        AVG(score) as avg_score,
        MAX(score) as best_score,
        SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) as wins,
        MIN(joined_at) as first_game,
        MAX(last_active) as last_active
      FROM ${this.getTableName()} 
      WHERE ${whereClause}
    `);
    
    const stats = stmt.get(...params);
    
    return {
      ...stats,
      win_rate: stats.total_games > 0 ? (stats.wins / stats.total_games * 100).toFixed(2) : 0,
      first_game: stats.first_game ? new Date(stats.first_game) : null,
      last_active: stats.last_active ? new Date(stats.last_active) : null
    };
  }

  /**
   * 获取排行榜
   * @param {object} options - 选项
   * @returns {Array} 排行榜
   */
  static getLeaderboard(options = {}) {
    const db = getDb();
    
    const {
      game_type = null,
      limit = 10,
      order_by = 'avg_score',
      time_range = null // 'day', 'week', 'month', 'year'
    } = options;
    
    let whereClause = '(deleted_at IS NULL OR deleted_at = \'\')';
    const params = [];
    
    if (game_type) {
      whereClause += ' AND game_type = ?';
      params.push(game_type);
    }
    
    if (time_range) {
      const timeMap = {
        day: "datetime('now', '-1 day')",
        week: "datetime('now', '-7 days')",
        month: "datetime('now', '-1 month')",
        year: "datetime('now', '-1 year')"
      };
      
      if (timeMap[time_range]) {
        whereClause += ` AND joined_at >= ${timeMap[time_range]}`;
      }
    }
    
    const orderByMap = {
      avg_score: 'avg_score DESC',
      best_score: 'best_score DESC',
      total_games: 'total_games DESC',
      win_rate: 'win_rate DESC'
    };
    
    const orderClause = orderByMap[order_by] || 'avg_score DESC';
    
    const stmt = db.prepare(`
      SELECT 
        player_name,
        COUNT(*) as total_games,
        AVG(score) as avg_score,
        MAX(score) as best_score,
        SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) as wins,
        (SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as win_rate,
        MAX(last_active) as last_active
      FROM ${this.getTableName()} 
      WHERE ${whereClause}
      GROUP BY player_name
      HAVING total_games >= 1
      ORDER BY ${orderClause}
      LIMIT ?
    `);
    
    params.push(limit);
    const results = stmt.all(...params);
    
    return results.map((row, index) => ({
      rank: index + 1,
      player_name: row.player_name,
      total_games: row.total_games,
      avg_score: parseFloat(row.avg_score.toFixed(2)),
      best_score: row.best_score,
      wins: row.wins,
      win_rate: parseFloat(row.win_rate.toFixed(2)),
      last_active: new Date(row.last_active)
    }));
  }

  /**
   * 清理非活跃玩家
   * @param {number} hoursAgo - 多少小时前的玩家
   * @returns {number} 清理的玩家数量
   */
  static cleanupInactivePlayers(hoursAgo = 24) {
    const db = getDb();
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    // 将长时间未活跃的玩家标记为离线
    const stmt = db.prepare(`
      UPDATE ${this.getTableName()} 
      SET is_online = 0 
      WHERE is_online = 1 AND last_active < ?
    `);
    
    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  /**
   * 获取表名
   * @returns {string} 表名
   */
  static getTableName() {
    return this.tableName || 'game_players';
  }

  /**
   * 解析玩家数据
   * @param {object} player - 原始玩家数据
   * @returns {object} 解析后的玩家数据
   */
  static parsePlayer(player) {
    if (!player) return null;
    
    try {
      return {
        ...player,
        is_ready: Boolean(player.is_ready),
        is_online: Boolean(player.is_online),
        game_data: player.game_data ? JSON.parse(player.game_data) : {},
        joined_at: new Date(player.joined_at),
        last_active: player.last_active ? new Date(player.last_active) : null,
        deleted_at: player.deleted_at ? new Date(player.deleted_at) : null
      };
    } catch (error) {
      console.error('解析玩家数据失败:', error);
      return {
        ...player,
        is_ready: Boolean(player.is_ready),
        is_online: Boolean(player.is_online),
        game_data: {},
        joined_at: new Date(player.joined_at),
        last_active: player.last_active ? new Date(player.last_active) : null
      };
    }
  }

  /**
   * 批量更新玩家状态
   * @param {Array} updates - 更新数组 [{id, updates}, ...]
   * @returns {number} 受影响的行数
   */
  static batchUpdate(updates) {
    const db = getDb();
    let totalChanges = 0;
    
    try {
      db.exec('BEGIN TRANSACTION');
      
      for (const { id, updates: playerUpdates } of updates) {
        const success = this.update(id, playerUpdates);
        if (success) totalChanges++;
      }
      
      db.exec('COMMIT');
      return totalChanges;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 创建数据表（用于初始化）
   * @param {string} tableName - 表名
   * @param {object} options - 选项
   */
  static createTable(tableName = 'game_players', options = {}) {
    const db = getDb();
    
    const extraColumns = options.extraColumns || '';
    const indices = options.indices || [];
    
    const sql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        session_id VARCHAR(36) NOT NULL,
        player_name VARCHAR(100) NOT NULL,
        player_color VARCHAR(7) DEFAULT '#007bff',
        is_ready BOOLEAN DEFAULT 0,
        is_online BOOLEAN DEFAULT 1,
        score INTEGER DEFAULT 0,
        game_data TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
        ${extraColumns ? ',' + extraColumns : ''}
      );
      
      CREATE INDEX IF NOT EXISTS idx_${tableName}_room_session ON ${tableName}(room_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_session_id ON ${tableName}(session_id);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_room_id ON ${tableName}(room_id);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_is_online ON ${tableName}(is_online);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_last_active ON ${tableName}(last_active);
    `;
    
    db.exec(sql);
    
    // 创建额外索引
    indices.forEach(index => {
      const indexSql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${tableName}(${index.columns.join(', ')});`;
      db.exec(indexSql);
    });
    
    console.log(`数据表 ${tableName} 创建完成`);
  }
}
