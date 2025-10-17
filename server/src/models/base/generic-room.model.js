/**
 * 通用房间数据模型
 * 提供基础的房间管理功能，支持多种游戏类型
 */
import { getDb } from '../../utils/dbPool.js';
import { AbstractRoomModel } from '../../services/multiplayer/abstract-models.js';

export class GenericRoomModel extends AbstractRoomModel {
  constructor(tableName = 'game_rooms', options = {}) {
    super();
    this.tableName = tableName;
    this.options = {
      enableSoftDelete: false,
      trackUpdatedAt: true,
      ...options,
    };
  }

  /**
   * 创建房间
   * @param {object} roomData - 房间数据
   * @returns {object} 创建的房间
   */
  static create(roomData) {
    const db = getDb();

    const gameSettings =
      typeof roomData.game_settings === 'object'
        ? JSON.stringify(roomData.game_settings)
        : roomData.game_settings;

    const stmt = db.prepare(`
      INSERT INTO ${this.getTableName()} (
        room_code, game_type, mode, status, max_players, current_players, 
        created_by, game_settings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const result = stmt.run(
      roomData.room_code,
      roomData.game_type || 'default',
      roomData.mode || 'competitive',
      roomData.status || 'waiting',
      roomData.max_players || 8,
      roomData.current_players || 1,
      roomData.created_by,
      gameSettings
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * 根据房间码查找房间
   * @param {string} roomCode - 房间码
   * @returns {object|null} 房间对象
   */
  static findByRoomCode(roomCode) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE room_code = ? AND (deleted_at IS NULL OR deleted_at = '')
    `);
    const room = stmt.get(roomCode);
    return room ? this.parseRoom(room) : null;
  }

  /**
   * 根据房间ID查找房间
   * @param {number} roomId - 房间ID
   * @returns {object|null} 房间对象
   */
  static findById(roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `);
    const room = stmt.get(roomId);
    return room ? this.parseRoom(room) : null;
  }

  /**
   * 更新房间信息
   * @param {number} roomId - 房间ID
   * @param {object} updates - 更新数据
   * @returns {boolean} 更新是否成功
   */
  static update(roomId, updates) {
    const db = getDb();

    // 构建动态更新语句
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'game_settings' && typeof value === 'object') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return false;

    // 添加更新时间
    fields.push("updated_at = datetime('now')");
    values.push(roomId);

    const stmt = db.prepare(`
      UPDATE ${this.getTableName()} 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * 删除房间
   * @param {number} roomId - 房间ID
   * @returns {boolean} 删除是否成功
   */
  static delete(roomId) {
    const db = getDb();

    if (this.options.enableSoftDelete) {
      // 软删除
      const stmt = db.prepare(`
        UPDATE ${this.getTableName()} 
        SET deleted_at = datetime('now'), status = 'deleted'
        WHERE id = ?
      `);
      const result = stmt.run(roomId);
      return result.changes > 0;
    } else {
      // 硬删除
      const stmt = db.prepare(
        `DELETE FROM ${this.getTableName()} WHERE id = ?`
      );
      const result = stmt.run(roomId);
      return result.changes > 0;
    }
  }

  /**
   * 获取活跃房间列表
   * @param {object} filters - 过滤条件
   * @returns {Array} 房间列表
   */
  static getActiveRooms(filters = {}) {
    const db = getDb();

    let whereClause =
      "(deleted_at IS NULL OR deleted_at = '') AND status IN ('waiting', 'playing')";
    const params = [];

    // 应用过滤器
    if (filters.game_type) {
      whereClause += ' AND game_type = ?';
      params.push(filters.game_type);
    }

    if (filters.mode) {
      whereClause += ' AND mode = ?';
      params.push(filters.mode);
    }

    if (filters.status) {
      whereClause += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.has_space) {
      whereClause += ' AND current_players < max_players';
    }

    const orderBy = filters.order_by || 'created_at DESC';
    const limit = filters.limit ? `LIMIT ${parseInt(filters.limit)}` : '';

    const stmt = db.prepare(`
      SELECT * FROM ${this.getTableName()} 
      WHERE ${whereClause} 
      ORDER BY ${orderBy} 
      ${limit}
    `);

    const rooms = stmt.all(...params);
    return rooms.map(room => this.parseRoom(room));
  }

  /**
   * 根据游戏类型获取房间
   * @param {string} gameType - 游戏类型
   * @param {object} filters - 额外过滤条件
   * @returns {Array} 房间列表
   */
  static findByGameType(gameType, filters = {}) {
    return this.getActiveRooms({ ...filters, game_type: gameType });
  }

  /**
   * 获取房间统计信息
   * @param {object} filters - 过滤条件
   * @returns {object} 统计信息
   */
  static getStats(filters = {}) {
    const db = getDb();

    let whereClause = "(deleted_at IS NULL OR deleted_at = '')";
    const params = [];

    if (filters.game_type) {
      whereClause += ' AND game_type = ?';
      params.push(filters.game_type);
    }

    if (filters.date_from) {
      whereClause += ' AND created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      whereClause += ' AND created_at <= ?';
      params.push(filters.date_to);
    }

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_rooms,
        COUNT(CASE WHEN status = 'playing' THEN 1 END) as playing_rooms,
        COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished_rooms,
        AVG(current_players) as avg_players,
        MAX(current_players) as max_players_in_room,
        COUNT(DISTINCT game_type) as game_types_count
      FROM ${this.getTableName()} 
      WHERE ${whereClause}
    `);

    return stmt.get(...params);
  }

  /**
   * 生成唯一房间码
   * @returns {string} 房间码
   */
  static generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    do {
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // 检查房间码是否已存在
      if (!this.findByRoomCode(result)) {
        return result;
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('无法生成唯一房间码');
  }

  /**
   * 清理过期房间
   * @param {number} hoursAgo - 多少小时前的房间
   * @returns {number} 清理的房间数量
   */
  static cleanupOldRooms(hoursAgo = 24) {
    const db = getDb();
    const cutoffTime = new Date(
      Date.now() - hoursAgo * 60 * 60 * 1000
    ).toISOString();

    const stmt = db.prepare(`
      DELETE FROM ${this.getTableName()} 
      WHERE (status = 'finished' OR status = 'abandoned') 
        AND (updated_at < ? OR created_at < ?)
    `);

    const result = stmt.run(cutoffTime, cutoffTime);
    return result.changes;
  }

  /**
   * 获取表名
   * @returns {string} 表名
   */
  static getTableName() {
    return this.tableName || 'game_rooms';
  }

  /**
   * 解析房间数据
   * @param {object} room - 原始房间数据
   * @returns {object} 解析后的房间数据
   */
  static parseRoom(room) {
    if (!room) return null;

    try {
      return {
        ...room,
        game_settings: room.game_settings ? JSON.parse(room.game_settings) : {},
        created_at: new Date(room.created_at),
        updated_at: room.updated_at ? new Date(room.updated_at) : null,
        ended_at: room.ended_at ? new Date(room.ended_at) : null,
        deleted_at: room.deleted_at ? new Date(room.deleted_at) : null,
      };
    } catch (error) {
      console.error('解析房间数据失败:', error);
      return {
        ...room,
        game_settings: {},
        created_at: new Date(room.created_at),
        updated_at: room.updated_at ? new Date(room.updated_at) : null,
      };
    }
  }

  /**
   * 批量操作
   * @param {string} operation - 操作类型
   * @param {Array} data - 数据数组
   * @returns {object} 操作结果
   */
  static batchOperation(operation, data) {
    const db = getDb();

    try {
      db.exec('BEGIN TRANSACTION');

      let affectedRows = 0;
      const results = [];

      switch (operation) {
        case 'create':
          for (const roomData of data) {
            const room = this.create(roomData);
            results.push(room);
            affectedRows++;
          }
          break;

        case 'update':
          for (const { id, updates } of data) {
            const success = this.update(id, updates);
            if (success) affectedRows++;
            results.push({ id, success });
          }
          break;

        case 'delete':
          for (const id of data) {
            const success = this.delete(id);
            if (success) affectedRows++;
            results.push({ id, success });
          }
          break;

        default:
          throw new Error(`不支持的批量操作: ${operation}`);
      }

      db.exec('COMMIT');

      return {
        success: true,
        affectedRows,
        results,
      };
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
  static createTable(tableName = 'game_rooms', options = {}) {
    const db = getDb();

    const extraColumns = options.extraColumns || '';
    const indices = options.indices || [];

    const sql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code VARCHAR(10) UNIQUE NOT NULL,
        game_type VARCHAR(50) NOT NULL DEFAULT 'default',
        mode VARCHAR(50) NOT NULL DEFAULT 'competitive',
        status VARCHAR(20) DEFAULT 'waiting',
        max_players INTEGER DEFAULT 8,
        current_players INTEGER DEFAULT 0,
        created_by VARCHAR(36) NOT NULL,
        game_settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL
        ${extraColumns ? ',' + extraColumns : ''}
      );
      
      CREATE INDEX IF NOT EXISTS idx_${tableName}_room_code ON ${tableName}(room_code);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_game_type ON ${tableName}(game_type);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);
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
