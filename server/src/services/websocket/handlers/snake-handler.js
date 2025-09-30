import { SnakeMultiplayerAdapter } from '../../snake-multiplayer.adapter.js';
import { SnakePlayerModel } from '../../../models/snake-player.model.js';
import { SnakeRoomModel } from '../../../models/snake-room.model.js';

export class SnakeMessageHandler {
  constructor(wsService) {
    this.ws = wsService;
    this.sessionRoomMap = new Map();
    this.adapter = new SnakeMultiplayerAdapter(wsService);
  }

  canHandle(type) {
    return typeof type === 'string' && type.startsWith('snake_');
  }

  async handle(sessionId, message) {
    const { type, data = {} } = message;

    switch (type) {
      case 'snake_create_room':
        await this.createRoom(sessionId, data);
        break;
      case 'snake_join_room':
        await this.joinRoom(sessionId, data);
        break;
      case 'snake_toggle_ready':
        await this.toggleReady(sessionId, data);
        break;
      case 'snake_vote':
        await this.adapter.handleVote(sessionId, data.roomCode, data.direction);
        break;
      case 'snake_move':
        await this.adapter.handleMove(sessionId, data.roomCode, data.direction);
        break;
      case 'snake_leave_room':
        await this.leaveRoom(sessionId, data);
        break;
      case 'snake_get_room_info':
        await this.getRoomInfo(sessionId, data);
        break;
      case 'snake_start_game':
        await this.startGame(sessionId, data);
        break;
      default:
        break;
    }
  }

  async createRoom(sessionId, data) {
    try {
      const { playerName, mode, gameSettings } = data || {};
      const result = await this.adapter.createRoom(
        sessionId,
        playerName,
        mode,
        gameSettings
      );

      this.trackRoom(sessionId, result?.room?.room_code);
      this.ws.sendToClient(sessionId, {
        type: 'snake_room_created',
        data: result,
      });
      this.ws.broadcast('snake_room_list_updated');
    } catch (error) {
      this.sendError(sessionId, error);
    }
  }

  async joinRoom(sessionId, data) {
    try {
      const { playerName, roomCode } = data || {};
      const result = await this.adapter.joinRoom(sessionId, playerName, roomCode);

      this.trackRoom(sessionId, result?.room?.room_code);
      this.ws.sendToClient(sessionId, {
        type: 'snake_room_joined',
        data: result,
      });
    } catch (error) {
      this.sendError(sessionId, error);
    }
  }

  async toggleReady(sessionId, data) {
    try {
      const { roomCode } = data || {};
      const result = await this.adapter.toggleReady(sessionId, roomCode);

      this.ws.sendToClient(sessionId, {
        type: 'snake_ready_toggled',
        data: result,
      });
    } catch (error) {
      this.sendError(sessionId, error);
    }
  }

  async leaveRoom(sessionId, data) {
    try {
      const { roomCode } = data || {};
      await this.adapter.leaveRoom(sessionId, roomCode);

      if (this.sessionRoomMap.get(sessionId) === roomCode) {
        this.sessionRoomMap.delete(sessionId);
      }

      this.ws.sendToClient(sessionId, {
        type: 'snake_room_left',
        data: { success: true },
      });

      // 离开房间后更新房间列表（可能房间被删除）
      this.ws.broadcast('snake_room_list_updated');
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  }

  async getRoomInfo(sessionId, data) {
    try {
      const { roomCode } = data || {};
      const roomInfo = await this.adapter.getRoomInfo(roomCode);

      this.ws.sendToClient(sessionId, {
        type: 'snake_room_info',
        data: roomInfo,
      });
    } catch (error) {
      this.sendError(sessionId, error);
    }
  }

  async startGame(sessionId, data) {
    try {
      const { roomCode } = data || {};
      await this.adapter.startGame(sessionId, roomCode);
      this.ws.broadcast('snake_room_list_updated');
    } catch (error) {
      console.error('处理 snake_start_game 失败:', error?.message || error);
      this.sendError(sessionId, error);
    }
  }

  async handleDisconnect(sessionId) {
    try {
      const roomCode = this.sessionRoomMap.get(sessionId);
      if (roomCode) {
        await this.adapter.leaveRoom(sessionId, roomCode);
        this.sessionRoomMap.delete(sessionId);
        this.ws.broadcast('snake_room_list_updated');
      }
    } catch (error) {
      console.error('处理玩家断线失败:', error);
    }
  }

  trackRoom(sessionId, roomCode) {
    if (!sessionId || !roomCode) return;
    this.sessionRoomMap.set(sessionId, roomCode);
  }

  sendError(sessionId, error) {
    const message =
      typeof error === 'string' ? error : error?.message || '未知错误';
    this.ws.sendToClient(sessionId, {
      type: 'snake_error',
      data: { message },
    });
  }

  async broadcastToRoom(roomId, eventType, data) {
    try {
      let sessionIds = [];

      try {
        const players =
          (await SnakePlayerModel.findOnlineByRoomId?.(roomId)) || [];
        sessionIds = players.map(player => player.session_id).filter(Boolean);
      } catch (error) {
        console.warn(
          'broadcastToRoom: failed to get players from PlayerModel, falling back to sessionRoomMap',
          error
        );
      }

      if (!sessionIds.length && this.sessionRoomMap.size > 0) {
        this.sessionRoomMap.forEach((code, session) => {
          if (!code) return;
          if (
            String(code) === String(roomId) ||
            String(code).toLowerCase() === String(roomId).toLowerCase()
          ) {
            sessionIds.push(session);
          }
        });
      }

      if (!sessionIds.length) {
        try {
          const room = await SnakeRoomModel.findById?.(roomId);
          if (room && room.id) {
            const players =
              (await SnakePlayerModel.findOnlineByRoomId?.(room.id)) || [];
            sessionIds = players
              .map(player => player.session_id)
              .filter(Boolean);
          }
        } catch (error) {
          console.warn('broadcastToRoom: failed to load room data', error);
        }
      }

      const message = {
        type: `snake_${eventType}`,
        data: { room_id: roomId, ...data },
      };

      if (sessionIds.length) {
        sessionIds.forEach(session => {
          this.ws.sendToClient(session, message);
        });
        return;
      }

      let sent = false;
      this.sessionRoomMap.forEach((code, session) => {
        if (!code) return;
        if (
          String(code) === String(roomId) ||
          String(code).toLowerCase() === String(roomId).toLowerCase()
        ) {
          this.ws.sendToClient(session, message);
          sent = true;
        }
      });

      if (!sent) {
        this.ws.broadcast(message);
        console.warn('broadcastToRoom: no specific clients matched, broadcasted');
      }
    } catch (error) {
      console.error('房间广播失败:', error);
    }
  }
}
