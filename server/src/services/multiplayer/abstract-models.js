/**
 * 抽象数据模型接口
 * 定义多人游戏数据模型的标准接口
 */

/**
 * 抽象房间模型接口
 * 所有游戏的房间模型都应该实现这些方法
 */
export class AbstractRoomModel {
  /**
   * 创建房间
   * @param {object} roomData - 房间数据
   * @returns {object} 创建的房间
   */
  static create(roomData) {
    throw new Error('create method must be implemented');
  }

  /**
   * 根据房间码查找房间
   * @param {string} roomCode - 房间码
   * @returns {object|null} 房间对象
   */
  static findByRoomCode(roomCode) {
    throw new Error('findByRoomCode method must be implemented');
  }

  /**
   * 根据房间ID查找房间
   * @param {number} roomId - 房间ID
   * @returns {object|null} 房间对象
   */
  static findById(roomId) {
    throw new Error('findById method must be implemented');
  }

  /**
   * 更新房间信息
   * @param {number} roomId - 房间ID
   * @param {object} updates - 更新数据
   * @returns {boolean} 更新是否成功
   */
  static update(roomId, updates) {
    throw new Error('update method must be implemented');
  }

  /**
   * 删除房间
   * @param {number} roomId - 房间ID
   * @returns {boolean} 删除是否成功
   */
  static delete(roomId) {
    throw new Error('delete method must be implemented');
  }

  /**
   * 获取活跃房间列表
   * @param {object} filters - 过滤条件
   * @returns {Array} 房间列表
   */
  static getActiveRooms(filters = {}) {
    throw new Error('getActiveRooms method must be implemented');
  }

  /**
   * 生成唯一房间码
   * @returns {string} 房间码
   */
  static generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * 抽象玩家模型接口
 * 所有游戏的玩家模型都应该实现这些方法
 */
export class AbstractPlayerModel {
  /**
   * 创建玩家
   * @param {object} playerData - 玩家数据
   * @returns {object} 创建的玩家
   */
  static create(playerData) {
    throw new Error('create method must be implemented');
  }

  /**
   * 根据房间ID和会话ID查找玩家
   * @param {number} roomId - 房间ID
   * @param {string} sessionId - 会话ID
   * @returns {object|null} 玩家对象
   */
  static findByRoomAndSession(roomId, sessionId) {
    throw new Error('findByRoomAndSession method must be implemented');
  }

  /**
   * 根据房间ID查找所有玩家
   * @param {number} roomId - 房间ID
   * @returns {Array} 玩家列表
   */
  static findByRoomId(roomId) {
    throw new Error('findByRoomId method must be implemented');
  }

  /**
   * 根据房间ID查找在线玩家
   * @param {number} roomId - 房间ID
   * @returns {Array} 在线玩家列表
   */
  static findOnlineByRoomId(roomId) {
    throw new Error('findOnlineByRoomId method must be implemented');
  }

  /**
   * 更新玩家信息
   * @param {number} playerId - 玩家ID
   * @param {object} updates - 更新数据
   * @returns {boolean} 更新是否成功
   */
  static update(playerId, updates) {
    throw new Error('update method must be implemented');
  }

  /**
   * 根据会话ID删除玩家
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 删除是否成功
   */
  static deleteBySession(sessionId) {
    throw new Error('deleteBySession method must be implemented');
  }

  /**
   * 根据房间ID删除所有玩家
   * @param {number} roomId - 房间ID
   * @returns {boolean} 删除是否成功
   */
  static deleteByRoomId(roomId) {
    throw new Error('deleteByRoomId method must be implemented');
  }

  /**
   * 获取房间内玩家数量
   * @param {number} roomId - 房间ID
   * @returns {number} 玩家数量
   */
  static getPlayerCount(roomId) {
    throw new Error('getPlayerCount method must be implemented');
  }
}

/**
 * 抽象游戏记录模型接口（可选）
 * 用于记录游戏历史和统计
 */
export class AbstractGameRecordModel {
  /**
   * 创建游戏记录
   * @param {object} recordData - 记录数据
   * @returns {object} 创建的记录
   */
  static create(recordData) {
    throw new Error('create method must be implemented');
  }

  /**
   * 根据房间ID查找游戏记录
   * @param {number} roomId - 房间ID
   * @returns {Array} 游戏记录列表
   */
  static findByRoomId(roomId) {
    throw new Error('findByRoomId method must be implemented');
  }

  /**
   * 获取玩家统计
   * @param {string} sessionId - 会话ID
   * @param {object} options - 选项
   * @returns {object} 玩家统计
   */
  static getPlayerStats(sessionId, options = {}) {
    throw new Error('getPlayerStats method must be implemented');
  }

  /**
   * 获取排行榜
   * @param {object} options - 选项
   * @returns {Array} 排行榜
   */
  static getLeaderboard(options = {}) {
    throw new Error('getLeaderboard method must be implemented');
  }
}

/**
 * 通用数据模型工厂
 * 用于创建符合接口的数据模型
 */
export class ModelFactory {
  /**
   * 创建房间模型
   * @param {string} gameType - 游戏类型
   * @param {object} options - 选项
   * @returns {class} 房间模型类
   */
  static createRoomModel(gameType, options = {}) {
    // 这里可以根据游戏类型返回对应的模型类
    // 或者返回一个通用的模型类，通过配置来区分不同游戏
    throw new Error('createRoomModel method must be implemented');
  }

  /**
   * 创建玩家模型
   * @param {string} gameType - 游戏类型
   * @param {object} options - 选项
   * @returns {class} 玩家模型类
   */
  static createPlayerModel(gameType, options = {}) {
    throw new Error('createPlayerModel method must be implemented');
  }

  /**
   * 创建游戏记录模型
   * @param {string} gameType - 游戏类型
   * @param {object} options - 选项
   * @returns {class} 游戏记录模型类
   */
  static createGameRecordModel(gameType, options = {}) {
    throw new Error('createGameRecordModel method must be implemented');
  }
}

/**
 * 模型验证器
 * 用于验证模型是否实现了必要的接口
 */
export class ModelValidator {
  /**
   * 验证房间模型
   * @param {class} RoomModel - 房间模型类
   * @returns {object} 验证结果
   */
  static validateRoomModel(RoomModel) {
    const requiredMethods = [
      'create', 'findByRoomCode', 'findById', 'update', 
      'delete', 'getActiveRooms'
    ];
    
    return this._validateMethods(RoomModel, requiredMethods, 'RoomModel');
  }

  /**
   * 验证玩家模型
   * @param {class} PlayerModel - 玩家模型类
   * @returns {object} 验证结果
   */
  static validatePlayerModel(PlayerModel) {
    const requiredMethods = [
      'create', 'findByRoomAndSession', 'findByRoomId', 'findOnlineByRoomId',
      'update', 'deleteBySession', 'deleteByRoomId', 'getPlayerCount'
    ];
    
    return this._validateMethods(PlayerModel, requiredMethods, 'PlayerModel');
  }

  /**
   * 验证方法是否存在
   * @private
   */
  static _validateMethods(Model, requiredMethods, modelName) {
    const missingMethods = [];
    
    requiredMethods.forEach(method => {
      if (typeof Model[method] !== 'function') {
        missingMethods.push(method);
      }
    });

    return {
      isValid: missingMethods.length === 0,
      missingMethods,
      modelName
    };
  }

  /**
   * 验证所有必需的模型
   * @param {object} models - 模型对象 {RoomModel, PlayerModel, GameRecordModel}
   * @returns {object} 验证结果
   */
  static validateAllModels({ RoomModel, PlayerModel, GameRecordModel }) {
    const results = {
      room: this.validateRoomModel(RoomModel),
      player: this.validatePlayerModel(PlayerModel),
      gameRecord: null
    };

    if (GameRecordModel) {
      results.gameRecord = this.validateGameRecordModel(GameRecordModel);
    }

    const allValid = Object.values(results)
      .filter(result => result !== null)
      .every(result => result.isValid);

    return {
      isValid: allValid,
      results
    };
  }

  /**
   * 验证游戏记录模型
   * @param {class} GameRecordModel - 游戏记录模型类
   * @returns {object} 验证结果
   */
  static validateGameRecordModel(GameRecordModel) {
    const requiredMethods = [
      'create', 'findByRoomId', 'getPlayerStats', 'getLeaderboard'
    ];
    
    return this._validateMethods(GameRecordModel, requiredMethods, 'GameRecordModel');
  }
}
