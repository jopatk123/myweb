/**
 * 通用多人游戏基础服务
 * 提供房间管理、玩家管理等通用功能
 */
export class BaseMultiplayerService {
  constructor(wsService, options = {}) {
    this.wsService = wsService;
    this.gameStates = new Map(); // roomId -> gameState
    this.gameTimers = new Map(); // roomId -> timer
    
    // 可配置的选项
    this.options = {
      // 玩家颜色池
      playerColors: [
        '#007bff', '#28a745', '#dc3545', '#ffc107',
        '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14',
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'
      ],
      // 默认游戏配置
      defaultGameConfig: {
        maxPlayers: 8,
        minPlayers: 1,
        gameSpeed: 150,
        timeout: 3000
      },
      // 清理间隔
      cleanupInterval: 5 * 60 * 1000, // 5分钟
      // 游戏类型标识
      gameType: 'default',
      ...options
    };
  }

  /**
   * 获取下一个玩家颜色
   * @param {number} roomId - 房间ID
   * @param {number} playerIndex - 玩家索引
   * @returns {string} 颜色值
   */
  getNextPlayerColor(roomId, playerIndex) {
    const { playerColors } = this.options;
    return playerColors[playerIndex % playerColors.length];
  }

  /**
   * 向房间广播消息
   * @param {number} roomId - 房间ID
   * @param {string} eventType - 事件类型
   * @param {object} data - 数据
   */
  broadcastToRoom(roomId, eventType, data) {
    if (this.wsService && this.wsService.broadcastToRoom) {
      this.wsService.broadcastToRoom(roomId, eventType, data);
    }
  }

  /**
   * 向特定玩家发送消息
   * @param {string} sessionId - 会话ID
   * @param {string} eventType - 事件类型
   * @param {object} data - 数据
   */
  sendToPlayer(sessionId, eventType, data) {
    if (this.wsService && this.wsService.sendToClient) {
      this.wsService.sendToClient(sessionId, eventType, data);
    }
  }

  /**
   * 初始化游戏状态（子类重写）
   * @param {number} roomId - 房间ID
   * @param {string} mode - 游戏模式
   * @param {object} config - 游戏配置
   */
  initGameState(roomId, mode, config = {}) {
    const gameState = {
      roomId,
      mode,
      status: 'waiting',
      createdAt: Date.now(),
      config: { ...this.options.defaultGameConfig, ...config },
      players: new Map(), // sessionId -> playerData
      gameData: {} // 游戏特定数据
    };
    
    this.gameStates.set(roomId, gameState);
    return gameState;
  }

  /**
   * 清理游戏资源
   * @param {number} roomId - 房间ID
   */
  cleanupGameResources(roomId) {
    // 清理定时器
    if (this.gameTimers.has(roomId)) {
      const timer = this.gameTimers.get(roomId);
      if (Array.isArray(timer)) {
        timer.forEach(t => clearInterval(t));
      } else {
        clearInterval(timer);
      }
      this.gameTimers.delete(roomId);
    }

    // 清理游戏状态
    if (this.gameStates.has(roomId)) {
      this.gameStates.delete(roomId);
    }

    console.log(`游戏资源已清理: 房间 ${roomId}`);
  }

  /**
   * 获取房间游戏状态
   * @param {number} roomId - 房间ID
   * @returns {object|null} 游戏状态
   */
  getGameState(roomId) {
    return this.gameStates.get(roomId);
  }

  /**
   * 更新房间游戏状态
   * @param {number} roomId - 房间ID
   * @param {object} updates - 更新数据
   */
  updateGameState(roomId, updates) {
    const currentState = this.gameStates.get(roomId) || {};
    this.gameStates.set(roomId, { ...currentState, ...updates });
  }

  /**
   * 添加游戏定时器
   * @param {number} roomId - 房间ID
   * @param {*} timer - 定时器
   * @param {string} key - 定时器键名（可选）
   */
  addGameTimer(roomId, timer, key = 'default') {
    if (!this.gameTimers.has(roomId)) {
      this.gameTimers.set(roomId, {});
    }
    
    const timers = this.gameTimers.get(roomId);
    if (timers[key]) {
      clearInterval(timers[key]);
    }
    timers[key] = timer;
  }

  /**
   * 移除游戏定时器
   * @param {number} roomId - 房间ID
   * @param {string} key - 定时器键名
   */
  removeGameTimer(roomId, key = 'default') {
    const timers = this.gameTimers.get(roomId);
    if (timers && timers[key]) {
      clearInterval(timers[key]);
      delete timers[key];
    }
  }

  /**
   * 格式化时间
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的时间
   */
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  /**
   * 生成随机位置
   * @param {number} boardSize - 棋盘大小
   * @param {Array} excludePositions - 排除的位置
   * @returns {object} 位置对象 {x, y}
   */
  generateRandomPosition(boardSize, excludePositions = []) {
    let position;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      position = {
        x: Math.floor(Math.random() * boardSize),
        y: Math.floor(Math.random() * boardSize)
      };
      attempts++;
    } while (
      attempts < maxAttempts && 
      excludePositions.some(pos => pos.x === position.x && pos.y === position.y)
    );

    return position;
  }

  /**
   * 检查位置是否碰撞
   * @param {object} position - 位置 {x, y}
   * @param {Array} obstacles - 障碍物列表
   * @returns {boolean} 是否碰撞
   */
  checkCollision(position, obstacles = []) {
    return obstacles.some(obstacle => 
      obstacle.x === position.x && obstacle.y === position.y
    );
  }

  /**
   * 验证游戏配置
   * @param {object} config - 游戏配置
   * @returns {object} 验证结果 {isValid, errors}
   */
  validateGameConfig(config) {
    const errors = [];
    const { defaultGameConfig } = this.options;

    if (config.maxPlayers < 1 || config.maxPlayers > 16) {
      errors.push('最大玩家数量必须在1-16之间');
    }

    if (config.minPlayers < 1 || config.minPlayers > config.maxPlayers) {
      errors.push('最小玩家数量不能超过最大玩家数量');
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedConfig: { ...defaultGameConfig, ...config }
    };
  }

  /**
   * 获取房间统计信息
   * @param {number} roomId - 房间ID
   * @returns {object} 统计信息
   */
  getRoomStats(roomId) {
    const gameState = this.getGameState(roomId);
    if (!gameState) return null;

    return {
      roomId,
      mode: gameState.mode,
      status: gameState.status,
      createdAt: gameState.createdAt,
      duration: Date.now() - gameState.createdAt,
      playerCount: gameState.players?.size || 0,
      gameType: this.options.gameType
    };
  }

  /**
   * 创建房间码生成器（可被子类重写）
   * @returns {string} 房间码
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取游戏类型
   * @returns {string} 游戏类型
   */
  getGameType() {
    return this.options.gameType;
  }

  /**
   * 设置游戏配置
   * @param {object} config - 配置
   */
  setGameConfig(config) {
    this.options = { ...this.options, ...config };
  }
}