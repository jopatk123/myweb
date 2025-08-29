/**
 * 贪吃蛇游戏生命周期管理器
 */
import { SnakeRoomModel } from '../../models/snake-room.model.js';
import { SnakePlayerModel } from '../../models/snake-player.model.js';
import { SnakeGameRecordModel } from '../../models/snake-game-record.model.js';
import { initSharedGame, initCompetitiveGame } from './game-state.js';
import { updateSharedGame, startVoteProcessingLoop } from './shared-game.js';
import { updateCompetitiveGame } from './competitive-game.js';

export class SnakeGameManager {
  constructor(service) {
    this.service = service;
    this.wsService = service.wsService;
  }

  async startGame(roomId) {
    const room = await SnakeRoomModel.findById(roomId);
    if (!room || room.status === 'playing') return;

    const players = await SnakePlayerModel.findOnlineByRoomId(roomId);
    if (players.length < 2) throw new Error('至少需要2个玩家才能开始游戏');

    await SnakeRoomModel.update(roomId, { status: 'playing' });
    const gameState = this.service.gameStates.get(roomId);
    
    if (room.mode === 'shared') {
      initSharedGame(gameState, players);
    } else if (room.mode === 'competitive') {
      initCompetitiveGame(gameState, players);
    }

    await this.service.broadcastToRoom(roomId, 'game_started', { game_state: gameState, players });
    this.startGameLoop(roomId);

    if (room.mode === 'shared') {
      startVoteProcessingLoop(roomId, this.service);
    }
    await this.service.notifyAutoPopup(roomId, room.mode);
  }

  startGameLoop(roomId) {
    const gameState = this.service.gameStates.get(roomId);
    if (!gameState) return;

    const gameLoop = async () => {
      const currentGameState = this.service.gameStates.get(roomId);
      if (!currentGameState || currentGameState.gameOver) return;

      try {
        if (currentGameState.mode === 'shared') {
          await updateSharedGame(roomId, this.service);
        } else if (currentGameState.mode === 'competitive') {
          await updateCompetitiveGame(roomId, this.service);
        }

        if (!this.service.gameStates.get(roomId)?.gameOver) {
          this.service.gameTimers.set(roomId, setTimeout(gameLoop, currentGameState.config.GAME_SPEED));
        }
      } catch (error) {
        console.error('游戏循环错误:', error);
        await this.endGame(roomId, 'error');
      }
    };
    this.service.gameTimers.set(roomId, setTimeout(gameLoop, gameState.config.GAME_SPEED));
  }

  async endGame(roomId, reason, winner = null) {
    const gameState = this.service.gameStates.get(roomId);
    if (!gameState || gameState.gameOver) return;

    gameState.gameOver = true;
    gameState.winner = winner;

    if (this.service.gameTimers.has(roomId)) clearTimeout(this.service.gameTimers.get(roomId));
    if (this.service.voteTimers.has(roomId)) clearTimeout(this.service.voteTimers.get(roomId));
    this.service.gameTimers.delete(roomId);
    this.service.voteTimers.delete(roomId);

    await SnakeRoomModel.update(roomId, { status: 'finished' });
    await this.recordGame(gameState, reason, winner);

    await this.service.broadcastToRoom(roomId, 'game_ended', {
      reason,
      winner,
      final_score: gameState.winnerScore,
      duration: gameState.duration,
      game_state: gameState
    });
    this.service.gameStates.delete(roomId);
    // 通知大厅刷新（房间变为 finished 或随后被删除）
    if (this.wsService?.broadcast) {
      this.wsService.broadcast('snake_room_list_updated');
    }
  }

  async recordGame(gameState, reason, winner) {
    const gameDuration = Math.floor((Date.now() - gameState.startTime) / 1000);
    const players = await SnakePlayerModel.findOnlineByRoomId(gameState.roomId);
    
    let winnerScore = 0;
    if (winner) {
      if (gameState.mode === 'shared') {
        winnerScore = gameState.sharedSnake?.score || 0;
      } else if (gameState.mode === 'competitive') {
        winnerScore = gameState.snakes[winner.session_id]?.score || 0;
      }
    }
    gameState.duration = gameDuration;
    gameState.winnerScore = winnerScore;

    await SnakeGameRecordModel.create({
      room_id: gameState.roomId,
      winner_session_id: winner?.session_id || null,
      winner_score: winnerScore,
      game_duration: gameDuration,
      player_count: players.length,
      mode: gameState.mode
    });
  }
}
