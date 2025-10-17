/**
 * 贪吃蛇游戏错误处理工具
 * 统一处理游戏中的各种错误情况
 */

import { ERROR_MESSAGES } from '../constants/gameConstants.js';

export class GameErrorHandler {
  constructor() {
    this.errorCallbacks = new Map();
  }

  /**
   * 注册错误回调
   */
  onError(type, callback) {
    if (!this.errorCallbacks.has(type)) {
      this.errorCallbacks.set(type, []);
    }
    this.errorCallbacks.get(type).push(callback);
  }

  /**
   * 移除错误回调
   */
  offError(type, callback) {
    if (this.errorCallbacks.has(type)) {
      const callbacks = this.errorCallbacks.get(type);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发错误处理
   */
  handleError(type, error, context = {}) {
    const errorInfo = this._createErrorInfo(type, error, context);

    // 记录错误日志
    this._logError(errorInfo);

    // 触发注册的回调
    if (this.errorCallbacks.has(type)) {
      this.errorCallbacks.get(type).forEach(callback => {
        try {
          callback(errorInfo);
        } catch (callbackError) {
          console.error('Error in error callback:', callbackError);
        }
      });
    }

    return errorInfo;
  }

  /**
   * 创建错误信息对象
   */
  _createErrorInfo(type, error, context) {
    return {
      type,
      message: this._getErrorMessage(type, error),
      originalError: error,
      context,
      timestamp: new Date().toISOString(),
      stack: error?.stack,
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  _getErrorMessage(type, error) {
    // 优先使用预定义的错误消息
    if (ERROR_MESSAGES[type]) {
      return ERROR_MESSAGES[type];
    }

    // 如果错误对象有消息，使用它
    if (error?.message) {
      return error.message;
    }

    // 根据错误类型返回通用消息
    switch (type) {
      case 'NETWORK_ERROR':
        return '网络连接出现问题，请检查网络设置';
      case 'WEBSOCKET_ERROR':
        return 'WebSocket连接失败，请刷新页面重试';
      case 'GAME_STATE_ERROR':
        return '游戏状态异常，请重新开始游戏';
      case 'VALIDATION_ERROR':
        return '输入数据无效，请检查后重试';
      default:
        return '发生未知错误，请稍后重试';
    }
  }

  /**
   * 记录错误日志
   */
  _logError(errorInfo) {
    const logLevel = this._getLogLevel(errorInfo.type);

    switch (logLevel) {
      case 'error':
        console.error(`[GameError:${errorInfo.type}]`, errorInfo);
        break;
      case 'warn':
        console.warn(`[GameWarning:${errorInfo.type}]`, errorInfo);
        break;
      case 'info':
        console.info(`[GameInfo:${errorInfo.type}]`, errorInfo);
        break;
      default:
        console.log(`[Game:${errorInfo.type}]`, errorInfo);
    }
  }

  /**
   * 获取日志级别
   */
  _getLogLevel(errorType) {
    const errorLevels = {
      NETWORK_ERROR: 'error',
      WEBSOCKET_ERROR: 'error',
      GAME_STATE_ERROR: 'error',
      VALIDATION_ERROR: 'warn',
      ROOM_NOT_FOUND: 'warn',
      ROOM_FULL: 'info',
      PERMISSION_DENIED: 'warn',
    };

    return errorLevels[errorType] || 'error';
  }

  /**
   * 清理所有回调
   */
  cleanup() {
    this.errorCallbacks.clear();
  }
}

/**
 * 网络错误处理器
 */
export class NetworkErrorHandler extends GameErrorHandler {
  handleWebSocketError(error, context = {}) {
    return this.handleError('WEBSOCKET_ERROR', error, {
      ...context,
      component: 'WebSocket',
    });
  }

  handleApiError(error, context = {}) {
    return this.handleError('API_ERROR', error, {
      ...context,
      component: 'API',
    });
  }

  handleConnectionTimeout(context = {}) {
    return this.handleError('CONNECTION_TIMEOUT', new Error('连接超时'), {
      ...context,
      component: 'Connection',
    });
  }
}

/**
 * 游戏逻辑错误处理器
 */
export class GameLogicErrorHandler extends GameErrorHandler {
  handleInvalidMove(move, context = {}) {
    return this.handleError('INVALID_MOVE', new Error(`无效移动: ${move}`), {
      ...context,
      component: 'GameLogic',
      move,
    });
  }

  handleGameStateCorruption(state, context = {}) {
    return this.handleError('GAME_STATE_ERROR', new Error('游戏状态损坏'), {
      ...context,
      component: 'GameState',
      corruptedState: state,
    });
  }

  handleCollisionDetectionError(error, context = {}) {
    return this.handleError('COLLISION_ERROR', error, {
      ...context,
      component: 'CollisionDetection',
    });
  }
}

/**
 * 多人游戏错误处理器
 */
export class MultiplayerErrorHandler extends GameErrorHandler {
  handleRoomError(roomCode, error, context = {}) {
    return this.handleError('ROOM_ERROR', error, {
      ...context,
      component: 'Room',
      roomCode,
    });
  }

  handlePlayerError(playerId, error, context = {}) {
    return this.handleError('PLAYER_ERROR', error, {
      ...context,
      component: 'Player',
      playerId,
    });
  }

  handleSyncError(error, context = {}) {
    return this.handleError('SYNC_ERROR', error, {
      ...context,
      component: 'Synchronization',
    });
  }
}

// 创建全局错误处理器实例
export const gameErrorHandler = new GameErrorHandler();
export const networkErrorHandler = new NetworkErrorHandler();
export const gameLogicErrorHandler = new GameLogicErrorHandler();
export const multiplayerErrorHandler = new MultiplayerErrorHandler();
