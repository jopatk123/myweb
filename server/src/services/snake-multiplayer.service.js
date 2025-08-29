/**
 * 贪吃蛇多人游戏服务 - 重构版
 */
import { SnakePlayerModel } from '../models/snake-player.model.js';
import { SnakeRoomModel } from '../models/snake-room.model.js';
import { SnakeRoomManager } from './snake-logic/SnakeRoomManager.js';
import { SnakeGameManager } from './snake-logic/SnakeGameManager.js';
import { initGameState } from './snake-logic/game-state.js';

export class SnakeMultiplayerService {
  constructor(wsService) {
    this.wsService = wsService;
    this.gameStates = new Map(); // roomId -> gameState
    this.gameTimers = new Map(); // roomId -> timer
    this.voteTimers = new Map(); // roomId -> voteTimer
    
    // 玩家颜色池
    this.playerColors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107',
      '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14'
    ];
    
    // 游戏常量
    this.GAME_CONFIG = {
      VOTE_TIMEOUT: 3000, // 投票超时时间（毫秒）
      GAME_SPEED: 150, // 游戏速度（毫秒）
      BOARD_SIZE: 20, // 游戏板大小
      INITIAL_SNAKE_LENGTH: 3
    };

    // 初始化管理器
    this.roomManager = new SnakeRoomManager(this);
    this.gameManager = new SnakeGameManager(this);
  }

  /**
   * 创建游戏房间
   */
  async createRoom(sessionId, playerName, mode, gameSettings = {}) {
    try {
      const { room, player } = await this.roomManager.createRoom(sessionId, playerName, mode, gameSettings);
      
      // 初始化游戏状态
      this.initGameState(room.id, mode);

      return { room, player };
    } catch (error) {
      console.error('创建房间失败:', error);
      throw new Error('创建房间失败');
    }
  }

  /**
   * 加入游戏房间
   */
  async joinRoom(sessionId, playerName, roomCode) {
    try {
      return await this.roomManager.joinRoom(sessionId, playerName, roomCode);
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  }

  /**
   * 切换准备状态
   */
  async toggleReady(sessionId, roomCode) {
    try {
      return await this.roomManager.toggleReady(sessionId, roomCode);
    } catch (error) {
      console.error('切换准备状态失败:', error);
      throw error;
    }
  }

  /**
   * 开始游戏
   */
  async startGame(roomId) {
    try {
      return await this.gameManager.startGame(roomId);
    } catch (error) {
      console.error('开始游戏失败:', error);
      throw error;
    }
  }

  /**
   * 结束游戏
   */
  async endGame(roomId, reason, winner = null) {
    try {
      return await this.gameManager.endGame(roomId, reason, winner);
    } catch (error) {
      console.error('结束游戏失败:', error);
    }
  }

  /**
   * 处理玩家投票（共享模式）
   */
  async handleVote(sessionId, roomCode, direction) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room || room.status !== 'playing') {
        return;
      }

      const player = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
      if (!player) {
        return;
      }

      const gameState = this.gameStates.get(room.id);
      if (!gameState || room.mode !== 'shared') {
        return;
      }

      // 记录投票
      gameState.votes[sessionId] = {
        direction,
        player_name: player.player_name,
        player_color: player.player_color,
        timestamp: Date.now()
      };

      // 通知房间内玩家投票更新
      await this.broadcastToRoom(room.id, 'vote_updated', {
        votes: gameState.votes,
        voter: {
          session_id: sessionId,
          player_name: player.player_name,
          direction
        }
      });

    } catch (error) {
      console.error('处理投票失败:', error);
    }
  }

  /**
   * 处理玩家移动（竞技模式）
   */
  async handleMove(sessionId, roomCode, direction) {
    try {
      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room || room.status !== 'playing') {
        return;
      }

      const gameState = this.gameStates.get(room.id);
      if (!gameState || room.mode !== 'competitive') {
        return;
      }

      const playerSnake = gameState.snakes[sessionId];
      if (!playerSnake || playerSnake.gameOver) {
        return;
      }

      // 检查方向是否有效（不能与当前方向相反）
      const oppositeDirections = {
        'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'
      };

      if (oppositeDirections[direction] === playerSnake.direction) {
        return;
      }

      // 设置新方向
      playerSnake.nextDirection = direction;

    } catch (error) {
      console.error('处理移动失败:', error);
    }
  }

  /**
   * 离开房间
   */
  async leaveRoom(sessionId, roomCode) {
    try {
      return await this.roomManager.leaveRoom(sessionId, roomCode);
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  }

  /**
   * 初始化游戏状态
   */
  initGameState(roomId, mode) {
    const gameState = initGameState(roomId, mode, this.GAME_CONFIG);
    this.gameStates.set(roomId, gameState);
    return gameState;
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
  async broadcastToRoom(roomId, type, data, excludeSessionId = null) {
    try {
      const players = await SnakePlayerModel.findOnlineByRoomId(roomId);
      
      players.forEach(player => {
        if (excludeSessionId && player.session_id === excludeSessionId) {
          return;
        }
        
        this.wsService.sendToClient(player.session_id, {
          type: `snake_${type}`,
          data: {
            room_id: roomId,
            ...data
          }
        });
      });
    } catch (error) {
      console.error('房间广播失败:', error);
    }
  }

  /**
   * 通知自动弹出
   */
  async notifyAutoPopup(roomId, mode) {
    try {
      // 获取房间内玩家
      const roomPlayers = await SnakePlayerModel.findOnlineByRoomId(roomId);
      const roomPlayerIds = new Set(roomPlayers.map(p => p.session_id));

      // 向所有其他在线用户发送自动弹出通知
      this.wsService.clients.forEach((client, sessionId) => {
        if (!roomPlayerIds.has(sessionId) && client.readyState === client.OPEN) {
          this.wsService.sendToClient(sessionId, {
            type: 'snake_auto_popup',
            data: {
              room_id: roomId,
              mode,
              player_count: roomPlayers.length,
              message: `有玩家开始了${mode === 'shared' ? '共享' : '竞技'}模式贪吃蛇游戏`
            }
          });
        }
      });
    } catch (error) {
      console.error('自动弹出通知失败:', error);
    }
  }

  /**
   * 获取房间信息
   */
  async getRoomInfo(roomCode) {
    try {
      return await this.roomManager.getRoomInfo(roomCode);
    } catch (error) {
      console.error('获取房间信息失败:', error);
      return null;
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清除所有计时器
    for (const timer of this.gameTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.voteTimers.values()) {
      clearTimeout(timer);
    }
    
    this.gameTimers.clear();
    this.voteTimers.clear();
    this.gameStates.clear();
  }
}
