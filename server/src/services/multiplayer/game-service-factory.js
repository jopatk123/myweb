/**
 * 游戏服务工厂
 * 用于创建和管理不同游戏类型的服务实例
 */
import { RoomManagerService } from './room-manager.service.js';
import { GenericRoomModel } from '../../models/base/generic-room.model.js';
import { GenericPlayerModel } from '../../models/base/generic-player.model.js';

/**
 * 游戏服务工厂类
 */
export class GameServiceFactory {
  constructor() {
    this.services = new Map(); // gameType -> service instance
    this.serviceConfigs = new Map(); // gameType -> config
    this.defaultConfig = {
      // 默认游戏配置
      minPlayers: 1,
      maxPlayers: 8,
      gameSpeed: 150,
      timeout: 3000,
      enableStats: true,
      enableLeaderboard: true,
      autoCleanup: true,
      cleanupInterval: 5 * 60 * 1000 // 5分钟
    };
  }

  /**
   * 注册游戏类型
   * @param {string} gameType - 游戏类型
   * @param {object} config - 游戏配置
   * @param {class} ServiceClass - 服务类（可选，默认使用RoomManagerService）
   * @returns {GameServiceFactory} 返回自身以支持链式调用
   */
  register(gameType, config = {}, ServiceClass = null) {
    const gameConfig = {
      ...this.defaultConfig,
      gameType,
      ...config
    };

    this.serviceConfigs.set(gameType, {
      config: gameConfig,
      ServiceClass: ServiceClass || RoomManagerService,
      tablePrefix: config.tablePrefix || gameType
    });

    console.log(`游戏类型 "${gameType}" 已注册`);
    return this;
  }

  /**
   * 创建或获取游戏服务实例
   * @param {string} gameType - 游戏类型
   * @param {object} wsService - WebSocket服务
   * @returns {RoomManagerService} 游戏服务实例
   */
  getService(gameType, wsService) {
    // 如果服务已存在，直接返回
    if (this.services.has(gameType)) {
      return this.services.get(gameType);
    }

    // 获取配置
    const serviceConfig = this.serviceConfigs.get(gameType);
    if (!serviceConfig) {
      throw new Error(`游戏类型 "${gameType}" 未注册`);
    }

    const { config, ServiceClass, tablePrefix } = serviceConfig;

    // 创建数据模型
    const RoomModel = this.createRoomModel(gameType, tablePrefix, config);
    const PlayerModel = this.createPlayerModel(gameType, tablePrefix, config);

    // 创建服务实例
    const service = new ServiceClass(wsService, RoomModel, PlayerModel, {
      ...config,
      gameType
    });

    // 缓存服务实例
    this.services.set(gameType, service);

    console.log(`游戏服务 "${gameType}" 创建完成`);
    return service;
  }

  /**
   * 创建房间数据模型
   * @param {string} gameType - 游戏类型
   * @param {string} tablePrefix - 表前缀
   * @param {object} config - 配置
   * @returns {class} 房间模型类
   */
  createRoomModel(gameType, tablePrefix, config) {
    const tableName = `${tablePrefix}_rooms`;
    
    // 创建专门的模型类
    class GameRoomModel extends GenericRoomModel {
      static tableName = tableName;
      
      static getTableName() {
        return tableName;
      }

      // 可以在这里添加游戏特定的方法
      static findByGameType(filters = {}) {
        return super.getActiveRooms({ ...filters, game_type: gameType });
      }

      static getGameTypeStats() {
        return super.getStats({ game_type: gameType });
      }
    }

    // 确保数据表存在
    this.ensureTableExists(tableName, 'room', config);

    return GameRoomModel;
  }

  /**
   * 创建玩家数据模型
   * @param {string} gameType - 游戏类型
   * @param {string} tablePrefix - 表前缀
   * @param {object} config - 配置
   * @returns {class} 玩家模型类
   */
  createPlayerModel(gameType, tablePrefix, config) {
    const tableName = `${tablePrefix}_players`;
    
    // 创建专门的模型类
    class GamePlayerModel extends GenericPlayerModel {
      static tableName = tableName;
      
      static getTableName() {
        return tableName;
      }

      // 可以在这里添加游戏特定的方法
      static getGameTypeStats(sessionId) {
        return super.getPlayerStats(sessionId, { game_type: gameType });
      }

      static getGameTypeLeaderboard(options = {}) {
        return super.getLeaderboard({ ...options, game_type: gameType });
      }
    }

    // 确保数据表存在
    this.ensureTableExists(tableName, 'player', config);

    return GamePlayerModel;
  }

  /**
   * 确保数据表存在
   * @param {string} tableName - 表名
   * @param {string} tableType - 表类型 ('room' | 'player')
   * @param {object} config - 配置
   */
  ensureTableExists(tableName, tableType, config) {
    try {
      if (tableType === 'room') {
        GenericRoomModel.createTable(tableName, {
          extraColumns: config.extraRoomColumns,
          indices: config.roomIndices
        });
      } else if (tableType === 'player') {
        GenericPlayerModel.createTable(tableName, {
          extraColumns: config.extraPlayerColumns,
          indices: config.playerIndices
        });
      }
    } catch (error) {
      console.error(`创建数据表 ${tableName} 失败:`, error);
    }
  }

  /**
   * 获取所有已注册的游戏类型
   * @returns {Array} 游戏类型列表
   */
  getRegisteredGameTypes() {
    return Array.from(this.serviceConfigs.keys());
  }

  /**
   * 获取游戏类型配置
   * @param {string} gameType - 游戏类型
   * @returns {object|null} 配置对象
   */
  getGameConfig(gameType) {
    const serviceConfig = this.serviceConfigs.get(gameType);
    return serviceConfig ? serviceConfig.config : null;
  }

  /**
   * 检查游戏类型是否已注册
   * @param {string} gameType - 游戏类型
   * @returns {boolean} 是否已注册
   */
  isRegistered(gameType) {
    return this.serviceConfigs.has(gameType);
  }

  /**
   * 销毁游戏服务
   * @param {string} gameType - 游戏类型
   */
  destroyService(gameType) {
    const service = this.services.get(gameType);
    if (service) {
      // 清理服务资源
      if (typeof service.cleanup === 'function') {
        service.cleanup();
      }
      
      this.services.delete(gameType);
      console.log(`游戏服务 "${gameType}" 已销毁`);
    }
  }

  /**
   * 销毁所有服务
   */
  destroyAllServices() {
    for (const gameType of this.services.keys()) {
      this.destroyService(gameType);
    }
  }

  /**
   * 获取所有活跃服务的统计信息
   * @returns {object} 统计信息
   */
  getAllServicesStats() {
    const stats = {};
    
    for (const [gameType, service] of this.services) {
      try {
        stats[gameType] = {
          activeRooms: service.getActiveRooms().length,
          gameStates: service.gameStates.size,
          gameTimers: service.gameTimers.size,
          config: this.getGameConfig(gameType)
        };
      } catch (error) {
        console.error(`获取 ${gameType} 统计失败:`, error);
        stats[gameType] = { error: error.message };
      }
    }
    
    return stats;
  }

  /**
   * 执行所有服务的清理操作
   */
  cleanupAllServices() {
    for (const [gameType, service] of this.services) {
      try {
        if (typeof service.cleanupEmptyRooms === 'function') {
          service.cleanupEmptyRooms();
        }
      } catch (error) {
        console.error(`清理 ${gameType} 服务失败:`, error);
      }
    }
  }

  /**
   * 批量注册游戏类型
   * @param {object} gameConfigs - 游戏配置对象 { gameType: config, ... }
   * @returns {GameServiceFactory} 返回自身以支持链式调用
   */
  registerBatch(gameConfigs) {
    Object.entries(gameConfigs).forEach(([gameType, config]) => {
      this.register(gameType, config);
    });
    return this;
  }

  /**
   * 创建快速配置方法
   * @param {string} gameType - 游戏类型
   * @param {object} quickConfig - 快速配置
   * @returns {object} 完整配置
   */
  createQuickConfig(gameType, quickConfig = {}) {
    const {
      minPlayers = 1,
      maxPlayers = 8,
      modes = ['competitive'],
      features = [],
      customFields = {}
    } = quickConfig;

    return {
      gameType,
      minPlayers,
      maxPlayers,
      defaultGameConfig: {
        minPlayers,
        maxPlayers,
        modes,
        features
      },
      extraRoomColumns: this.generateExtraColumns(customFields.room),
      extraPlayerColumns: this.generateExtraColumns(customFields.player),
      ...quickConfig
    };
  }

  /**
   * 生成额外字段的SQL
   * @param {object} fields - 字段定义
   * @returns {string} SQL字符串
   */
  generateExtraColumns(fields = {}) {
    if (!fields || Object.keys(fields).length === 0) {
      return '';
    }

    const columns = Object.entries(fields).map(([name, type]) => {
      return `${name} ${type}`;
    });

    return columns.join(', ');
  }
}

// 创建单例实例
export const gameServiceFactory = new GameServiceFactory();

// 预定义的游戏配置
export const PREDEFINED_GAMES = {
  snake: {
    minPlayers: 1,
    maxPlayers: 8,
    modes: ['shared', 'competitive'],
    features: ['voting', 'spectating'],
    defaultGameConfig: {
      boardSize: 20,
      gameSpeed: 150,
      voteTimeout: 3000
    },
    extraRoomColumns: 'board_size INTEGER DEFAULT 20, vote_timeout INTEGER DEFAULT 3000',
    extraPlayerColumns: 'snake_length INTEGER DEFAULT 3, last_vote VARCHAR(10)'
  },
  
  gomoku: {
    minPlayers: 2,
    maxPlayers: 2,
    modes: ['competitive'],
    features: ['spectating', 'undo'],
    defaultGameConfig: {
      boardSize: 15,
      timeLimit: 300,
      allowUndo: true
    },
    extraRoomColumns: 'board_size INTEGER DEFAULT 15, time_limit INTEGER DEFAULT 300',
    extraPlayerColumns: 'moves_count INTEGER DEFAULT 0, time_used INTEGER DEFAULT 0'
  },
  
  chess: {
    minPlayers: 2,
    maxPlayers: 2,
    modes: ['competitive', 'blitz', 'rapid'],
    features: ['spectating', 'undo', 'timer'],
    defaultGameConfig: {
      timeControl: 600,
      increment: 5,
      allowTakebacks: false
    },
    extraRoomColumns: 'time_control INTEGER DEFAULT 600, increment INTEGER DEFAULT 5',
    extraPlayerColumns: 'time_remaining INTEGER, moves_count INTEGER DEFAULT 0'
  }
};

// 快速注册预定义游戏
export function registerPredefinedGames() {
  Object.entries(PREDEFINED_GAMES).forEach(([gameType, config]) => {
    gameServiceFactory.register(gameType, config);
  });
  
  console.log('预定义游戏已注册:', Object.keys(PREDEFINED_GAMES));
}

// 导出工厂方法
export function createGameService(gameType, wsService) {
  return gameServiceFactory.getService(gameType, wsService);
}

export function registerGame(gameType, config, ServiceClass) {
  return gameServiceFactory.register(gameType, config, ServiceClass);
}
