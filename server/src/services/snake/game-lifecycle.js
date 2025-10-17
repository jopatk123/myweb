/**
 * 游戏生命周期管理器
 */
import { initCompetitivePlayers } from './competitive-mode.logic.js';
import { SnakeGameRecordModel } from '../../models/snake-game-record.model.js';

export class GameLifecycleManager {
  constructor(snakeGameService) {
    this.service = snakeGameService;
  }

  /**
   * 启动游戏
   */
  async startGame(roomId, hostSessionId = null) {
    const room = await this._validateRoom(roomId, hostSessionId);
    const players = await this._validatePlayers(roomId, room);

    let gameState = this.service.getGameState(roomId);
    if (!gameState) {
      throw new Error('游戏状态不存在');
    }

    // 如果游戏已结束，重新初始化
    if (gameState.status === 'finished') {
      this.service.initGameState(roomId, room.mode);
      gameState = this.service.getGameState(roomId);
    }

    // 防止重复启动
    if (this.service.gameTimers.has(roomId)) {
      return { success: true, players };
    }

    await this._updateRoomAndGameState(roomId, gameState, players);
    this._startGameLoop(roomId, gameState, players);
    this._broadcastGameStart(roomId, gameState, players);

    return { success: true, players };
  }

  /**
   * 验证房间
   */
  async _validateRoom(roomId, hostSessionId) {
    const room = this.service.RoomModel.findById(roomId);
    if (!room) {
      throw new Error('房间不存在');
    }

    if (room.status === 'playing') {
      return room; // 游戏已在进行中
    }

    if (hostSessionId && room.created_by !== hostSessionId) {
      throw new Error('只有房主可以开始游戏');
    }

    return room;
  }

  /**
   * 验证玩家
   */
  async _validatePlayers(roomId, room) {
    const players = this.service.PlayerModel.findOnlineByRoomId(roomId);

    if (players.length === 0) {
      throw new Error('房间内没有玩家');
    }

    if (room.mode === 'competitive') {
      const readyPlayers = players.filter(p => p.is_ready);
      if (readyPlayers.length !== players.length || players.length < 2) {
        throw new Error('竞技模式需要至少2名玩家且所有玩家都准备就绪');
      }
    }

    return players;
  }

  /**
   * 更新房间和游戏状态
   */
  async _updateRoomAndGameState(roomId, gameState, players) {
    this.service.RoomModel.update(roomId, { status: 'playing' });
    // 动态调整棋盘大小：以 2 人=基础大小，为基准每增加 1 人边长 +1
    if (gameState.mode === 'competitive') {
      const base = this.service.SNAKE_CONFIG.BOARD_SIZE; // 当前 20 (针对 2 人)
      const extraPlayers = Math.max(0, players.length - 2);
      const dynamicSize = base + extraPlayers * 3; // 每增加1玩家长和宽各+3
      if (!gameState.config) gameState.config = {};
      gameState.config.BOARD_SIZE = dynamicSize;
    }
    this.service.updateGameState(roomId, {
      status: 'playing',
      startTime: Date.now(),
    });
    gameState.playerCount = players.length;
  }

  /**
   * 启动游戏循环
   */
  _startGameLoop(roomId, gameState, players) {
    if (gameState.mode === 'shared') {
      this._initializeSharedMode(gameState, players);
      this.service.startSharedLoop(roomId);
    } else if (gameState.mode === 'competitive') {
      this._initializeCompetitiveMode(roomId, players);
      this.service.startCompetitiveLoop(roomId);
    }
  }

  /**
   * 初始化共享模式
   */
  _initializeSharedMode(gameState, players) {
    if (players.length === 1 && gameState.sharedSnake) {
      gameState.sharedSnake.isWaitingForFirstVote = false;
      gameState.votes = {};
      gameState.voteStartTime = null;
    }
  }

  /**
   * 初始化竞技模式
   */
  _initializeCompetitiveMode(roomId, players) {
    // 直接使用顶层已导入的 initCompetitivePlayers
    initCompetitivePlayers(this.service, roomId, players);
  }

  /**
   * 广播游戏开始
   */
  _broadcastGameStart(roomId, gameState, players) {
    this.service.broadcastToRoom(roomId, 'game_started', {
      room_id: roomId,
      game_state: this.service.getGameState(roomId),
      players,
    });
  }

  /**
   * 结束游戏
   */
  endGame(roomId, reason = 'finished') {
    const gameState = this.service.getGameState(roomId);
    if (!gameState) return;

    this._clearGameTimers(roomId);
    this._updateGameEndState(roomId, gameState, reason);
    this._saveGameRecord(roomId, gameState, reason);
    this._broadcastGameEnd(roomId, gameState, reason);
  }

  /**
   * 清理游戏计时器
   */
  _clearGameTimers(roomId) {
    if (this.service.gameTimers.has(roomId)) {
      clearInterval(this.service.gameTimers.get(roomId));
      this.service.gameTimers.delete(roomId);
    }

    // 清理投票计时器
    if (this.service.voteManager) {
      this.service.voteManager.cleanup(roomId);
    }
  }

  /**
   * 更新游戏结束状态
   */
  _updateGameEndState(roomId, gameState, reason) {
    this.service.updateGameState(roomId, {
      status: 'finished',
      endTime: Date.now(),
      endReason: reason,
    });

    this.service.RoomModel.update(roomId, { status: 'waiting' });
  }

  /**
   * 保存游戏记录
   */
  _saveGameRecord(roomId, gameState, reason) {
    try {
      const room = this.service.RoomModel.findById(roomId);
      if (!room) return;

      const players = this.service.PlayerModel.findByRoomId(roomId);
      const finalScore = gameState.sharedSnake?.score || 0;
      const duration = gameState.startTime
        ? Date.now() - gameState.startTime
        : 0;

      if (gameState.mode === 'shared') {
        this._saveSharedModeRecords(
          roomId,
          gameState,
          players,
          finalScore,
          duration,
          reason
        );
      } else if (gameState.mode === 'competitive') {
        this._saveCompetitiveModeRecords(
          roomId,
          gameState,
          players,
          duration,
          reason
        );
      }
    } catch (error) {
      console.error('保存游戏记录失败:', error);
    }
  }

  /**
   * 保存共享模式记录
   */
  _saveSharedModeRecords(
    roomId,
    gameState,
    players,
    finalScore,
    duration,
    reason
  ) {
    players.forEach(player => {
      SnakeGameRecordModel.create({
        room_id: roomId,
        mode: gameState.mode,
        winner_session_id: player.session_id,
        winner_score: finalScore,
        game_duration: duration,
        end_reason: reason,
        player_count: players.length,
      });
    });
  }

  /**
   * 保存竞技模式记录
   */
  _saveCompetitiveModeRecords(roomId, gameState, players, duration, reason) {
    // 找出获胜者
    const winner = gameState.winner;
    if (winner) {
      SnakeGameRecordModel.create({
        room_id: roomId,
        mode: gameState.mode,
        winner_session_id: winner.session_id,
        winner_score: gameState.snakes[winner.session_id]?.score || 0,
        game_duration: duration,
        end_reason: reason,
        player_count: players.length,
      });
    }
  }

  /**
   * 广播游戏结束
   */
  _broadcastGameEnd(roomId, gameState, reason) {
    this.service.broadcastToRoom(roomId, 'game_ended', {
      room_id: roomId,
      reason,
      final_score: gameState.sharedSnake?.score || 0,
      game_state: gameState,
      winner: gameState.winner || null, // 兼容旧字段
      loser: gameState.loser || null,
      winners:
        gameState.winners || (gameState.winner ? [gameState.winner] : []),
    });
  }
}
