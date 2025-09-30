import { GomokuMultiplayerService } from '../../gomoku-multiplayer.service.js';

export class GomokuMessageHandler {
  constructor(wsService) {
    this.ws = wsService;
    this.service = new GomokuMultiplayerService(wsService);
  }

  canHandle(type) {
    return typeof type === 'string' && type.startsWith('gomoku_');
  }

  async handle(sessionId, message) {
    const { type, data = {} } = message;

    try {
      switch (type) {
        case 'gomoku_create_room':
          this.service.createRoom(sessionId, data.playerName);
          break;
        case 'gomoku_join_room':
          this.service.joinRoom(sessionId, data.playerName, data.roomCode);
          break;
        case 'gomoku_toggle_ready':
          this.service.toggleReady(sessionId, data.roomCode);
          break;
        case 'gomoku_start_game':
          this.service.startGame(sessionId, data.roomCode);
          break;
        case 'gomoku_place_piece':
          this.service.placePiece(sessionId, data.roomCode, data.row, data.col);
          break;
        case 'gomoku_leave_room':
          this.service.leaveRoom(sessionId, data.roomCode);
          this.ws.sendToClient(sessionId, {
            type: 'gomoku_room_left',
            data: { success: true },
          });
          break;
        case 'gomoku_get_room_info':
          this.respondRoomInfo(sessionId, data.roomCode);
          break;
        case 'gomoku_get_room_list':
          this.respondRoomList(sessionId);
          break;
        default:
          break;
      }
    } catch (error) {
      this.ws.sendToClient(sessionId, {
        type: 'gomoku_error',
        data: { message: error?.message || '操作失败' },
      });
    }
  }

  handleDisconnect(sessionId) {
    if (typeof this.service.handlePlayerDisconnect === 'function') {
      this.service.handlePlayerDisconnect(sessionId);
    }
  }

  respondRoomInfo(sessionId, roomCode) {
    try {
      const info = this.service.getRoomInfo(roomCode);
      this.ws.sendToClient(sessionId, {
        type: 'gomoku_room_info',
        data: info,
      });
    } catch (error) {
      this.ws.sendToClient(sessionId, {
        type: 'gomoku_error',
        data: { message: error?.message || '获取房间信息失败' },
      });
    }
  }

  respondRoomList(sessionId) {
    const rooms = this.service.getActiveRooms();
    this.ws.sendToClient(sessionId, {
      type: 'gomoku_room_list',
      data: { rooms },
    });
  }
}
