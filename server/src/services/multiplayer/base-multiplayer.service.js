/**
 * 通用多人游戏基础服务
 * 提供房间管理、玩家管理等通用功能
 */
export class BaseMultiplayerService {
  constructor(wsService) {
    this.wsService = wsService;
    this.gameStates = new Map(); // roomId -> gameState
    this.gameTimers = new Map(); // roomId -> timer
    
    // 玩家颜色池
    this.playerColors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107',
      '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14'
    ];
  }

  /**
   * 获取下一个玩家颜色
   */
  getNextPlayerColor(roomId, playerIndex) {
    return this.playerColors[playerIndex % this.playerColors.length];
  }

  /**
   * 向房间广播消息
   */
  broadcastToRoom(roomId, eventType, data) {
    if (this.wsService && this.wsService.broadcastToRoom) {
      this.wsService.broadcastToRoom(roomId, eventType, data);
    }
  }

  /**
   * 向特定玩家发送消息
   */
  sendToPlayer(sessionId, eventType, data) {
    if (this.wsService && this.wsService.sendToClient) {
      this.wsService.sendToClient(sessionId, eventType, data);
    }
  }

  /**
   * 初始化游戏状态（子类重写）
   */
  initGameState(roomId, mode) {
    this.gameStates.set(roomId, {
      mode,
      status: 'waiting',
      createdAt: Date.now()
    });
  }

  /**
   * 清理游戏资源
   */
  cleanupGameResources(roomId) {
    // 清理定时器
    if (this.gameTimers.has(roomId)) {
      clearInterval(this.gameTimers.get(roomId));
      this.gameTimers.delete(roomId);
    }

    // 清理游戏状态
    if (this.gameStates.has(roomId)) {
      this.gameStates.delete(roomId);
    }
  }

  /**
   * 获取房间游戏状态
   */
  getGameState(roomId) {
    return this.gameStates.get(roomId);
  }

  /**
   * 更新房间游戏状态
   */
  updateGameState(roomId, updates) {
    const currentState = this.gameStates.get(roomId) || {};
    this.gameStates.set(roomId, { ...currentState, ...updates });
  }

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  /**
   * 生成随机位置
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
   */
  checkCollision(position, obstacles = []) {
    return obstacles.some(obstacle => 
      obstacle.x === position.x && obstacle.y === position.y
    );
  }
}
