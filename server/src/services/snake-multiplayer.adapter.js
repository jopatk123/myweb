/**
 * 过渡适配层：将旧的 SnakeMultiplayerService 接口映射到新的 SnakeGameService / RoomManagerService
 * 目的：在不一次性重写前端消息协议的情况下，逐步迁移到新的抽象。
 */
import { SnakeGameService } from './snake-game.service.js';
import { SnakeRoomModel } from '../models/snake-room.model.js';

export class SnakeMultiplayerAdapter {
  constructor(wsService) {
    this.snakeGame = new SnakeGameService(wsService);
  }

  // 旧接口: createRoom -> 新接口: createSnakeRoom
  async createRoom(sessionId, playerName, mode, gameSettings) {
    return await this.snakeGame.createSnakeRoom(sessionId, playerName, mode, gameSettings);
  }

  // 旧接口: joinRoom (roomCode)
  async joinRoom(sessionId, playerName, roomCode) {
    return await this.snakeGame.joinRoom(sessionId, playerName, roomCode);
  }

  // 旧接口: toggleReady(roomCode) -> 新: togglePlayerReady(roomId)
  async toggleReady(sessionId, roomCode) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) throw new Error('房间不存在');
    return await this.snakeGame.togglePlayerReady(sessionId, room.id);
  }

  // 旧接口: handleVote(sessionId, roomCode, direction)
  async handleVote(sessionId, roomCode, direction) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) return;
    await this.snakeGame.handleVote(room.id, sessionId, direction);
  }

  // 旧接口: handleMove (竞技模式暂未在新服务实现，此处占位 保持兼容)
  async handleMove(sessionId, roomCode, direction) {
  const room = await SnakeRoomModel.findByRoomCode(roomCode);
  if (!room) return;
  // 仅竞技模式
  if (room.mode !== 'competitive') return;
  this.snakeGame.handleCompetitiveMove(room.id, sessionId, direction);
  }

  // 旧接口: leaveRoom(sessionId, roomCode)
  async leaveRoom(sessionId, roomCode) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) return;
    return await this.snakeGame.leaveRoom(sessionId, room.id);
  }

  // 旧接口: getRoomInfo(roomCode)
  async getRoomInfo(roomCode) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) return null;
    const details = await this.snakeGame.getRoomDetails(room.id);
    return {
      room: details.room,
      players: details.players,
      game_state: this.snakeGame.getGameState?.(room.id) || null
    };
  }
}
