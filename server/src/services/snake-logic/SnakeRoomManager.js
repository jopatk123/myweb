/**
 * 贪吃蛇房间和玩家管理器
 */
import { SnakeRoomModel } from '../../models/snake-room.model.js';
import { SnakePlayerModel } from '../../models/snake-player.model.js';

export class SnakeRoomManager {
  constructor(service) {
    this.service = service;
    this.wsService = service.wsService;
  }

  async createRoom(sessionId, playerName, mode, gameSettings) {
    const roomCode = await SnakeRoomModel.generateRoomCode();
    const room = await SnakeRoomModel.create({
      room_code: roomCode,
      mode,
      created_by: sessionId,
      game_settings: { ...this.service.GAME_CONFIG, ...gameSettings }
    });

    const playerColor = this.service.getNextPlayerColor(room.id, 0);
    const player = await SnakePlayerModel.create({
      room_id: room.id,
      session_id: sessionId,
      player_name: playerName,
      player_color: playerColor,
      is_ready: false
    });

    await SnakeRoomModel.update(room.id, { current_players: 1 });
    return { room, player };
  }

  async joinRoom(sessionId, playerName, roomCode) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) throw new Error('房间不存在');
    if (room.status === 'finished') throw new Error('游戏已结束');

    const existingPlayer = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
    if (existingPlayer) {
      await SnakePlayerModel.update(existingPlayer.id, { is_online: true });
      return { room, player: existingPlayer };
    }

    const currentPlayers = await SnakePlayerModel.getPlayerCount(room.id);
    if (currentPlayers >= room.max_players) throw new Error('房间已满');

    const playerColor = this.service.getNextPlayerColor(room.id, currentPlayers);
    const player = await SnakePlayerModel.create({
      room_id: room.id,
      session_id: sessionId,
      player_name: playerName,
      player_color: playerColor,
      is_ready: false
    });

    await SnakeRoomModel.update(room.id, { current_players: currentPlayers + 1 });
    await this.service.broadcastToRoom(room.id, 'player_joined', { player, room }, sessionId);
    return { room, player };
  }

  async toggleReady(sessionId, roomCode) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) throw new Error('房间不存在');
    const player = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
    if (!player) throw new Error('玩家不在房间中');
    if (room.status === 'playing') throw new Error('游戏进行中，无法更改准备状态');

    const updatedPlayer = await SnakePlayerModel.update(player.id, { is_ready: !player.is_ready });
    const readyCount = await SnakePlayerModel.getReadyCount(room.id);
    const totalPlayers = await SnakePlayerModel.getPlayerCount(room.id);

    await this.service.broadcastToRoom(room.id, 'player_ready_changed', {
      player: updatedPlayer,
      ready_count: readyCount,
      total_players: totalPlayers,
      can_start: readyCount >= 2 && readyCount === totalPlayers
    });

    if (readyCount >= 2 && readyCount === totalPlayers) {
      setTimeout(() => this.service.gameManager.startGame(room.id), 2000);
    }
    return updatedPlayer;
  }

  async leaveRoom(sessionId, roomCode) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) return;
    const player = await SnakePlayerModel.findByRoomAndSession(room.id, sessionId);
    if (!player) return;

    await SnakePlayerModel.update(player.id, { is_online: false });
    const onlineCount = await SnakePlayerModel.getPlayerCount(room.id);
    await SnakeRoomModel.update(room.id, { current_players: onlineCount });
    await this.service.broadcastToRoom(room.id, 'player_left', { player, online_count: onlineCount }, sessionId);

    if (onlineCount === 0) {
      await this.service.gameManager.endGame(room.id, 'empty');
    } else if (room.status === 'playing' && onlineCount < 2) {
      await this.service.gameManager.endGame(room.id, 'insufficient_players');
    }
  }

  async getRoomInfo(roomCode) {
    const room = await SnakeRoomModel.findByRoomCode(roomCode);
    if (!room) return null;
    const players = await SnakePlayerModel.findOnlineByRoomId(room.id);
    const gameState = this.service.gameStates.get(room.id);
    return { room, players, game_state: gameState || null };
  }
}
