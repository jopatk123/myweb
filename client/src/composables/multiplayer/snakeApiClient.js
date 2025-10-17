/**
 * 贪吃蛇多人游戏 API 客户端
 * 封装所有与服务器的通信逻辑
 */

export class SnakeApiClient {
  constructor(wsService) {
    this.ws = wsService;
  }

  /**
   * 创建房间
   */
  createRoom(playerName, mode, gameSettings = {}) {
    return this.ws.send({
      type: 'snake_create_room',
      data: { playerName, mode, gameSettings },
    });
  }

  /**
   * 加入房间
   */
  joinRoom(playerName, roomCode) {
    return this.ws.send({
      type: 'snake_join_room',
      data: { playerName, roomCode: roomCode.toUpperCase() },
    });
  }

  /**
   * 切换准备状态
   */
  toggleReady(roomCode) {
    if (!roomCode) return;
    return this.ws.send({
      type: 'snake_toggle_ready',
      data: { roomCode },
    });
  }

  /**
   * 投票（共享模式）
   */
  vote(roomCode, direction) {
    if (!roomCode) return;
    return this.ws.send({
      type: 'snake_vote',
      data: { roomCode, direction },
    });
  }

  /**
   * 移动（竞技模式）
   */
  move(roomCode, direction) {
    if (!roomCode) return;
    return this.ws.send({
      type: 'snake_move',
      data: { roomCode, direction },
    });
  }

  /**
   * 离开房间
   */
  leaveRoom(roomCode) {
    if (!roomCode) return;
    return this.ws.send({
      type: 'snake_leave_room',
      data: { roomCode },
    });
  }

  /**
   * 获取房间信息
   */
  getRoomInfo(roomCode) {
    return this.ws.send({
      type: 'snake_get_room_info',
      data: { roomCode: roomCode.toUpperCase() },
    });
  }

  /**
   * 开始游戏
   */
  startGame(roomCode) {
    if (!roomCode) return;
    return this.ws.send({
      type: 'snake_start_game',
      data: { roomCode },
    });
  }

  /**
   * 踢出玩家
   */
  kickPlayer(roomCode, playerId) {
    if (!roomCode) return;
    return this.ws.send({
      type: 'snake_kick_player',
      data: { roomCode, playerId },
    });
  }
}
