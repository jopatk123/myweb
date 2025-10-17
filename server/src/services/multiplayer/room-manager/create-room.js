// 创建房间相关逻辑
export function createRoomFactory(Service) {
  Service.prototype.createRoom = function (
    sessionId,
    playerName,
    roomData,
    gameConfig = {}
  ) {
    try {
      const validation = this.validateGameConfig(gameConfig);
      if (!validation.isValid) {
        throw new Error(`游戏配置无效: ${validation.errors.join(', ')}`);
      }
      const roomCode = this.generateRoomCode();
      const room = this.RoomModel.create({
        room_code: roomCode,
        created_by: sessionId,
        game_settings: validation.validatedConfig,
        current_players: 1,
        game_type: this.getGameType(),
        ...roomData,
      });
      const playerColor = this.getNextPlayerColor(room.id, 0);
      const player = this.PlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false,
      });
      this.initGameState(room.id, roomData.mode, validation.validatedConfig);
      const updatedRoom = this.RoomModel.findById(room.id);
      console.log(
        `${this.getGameType()} 房间已创建: ${roomCode} (ID: ${room.id})`
      );
      return { room: updatedRoom, player };
    } catch (error) {
      console.error('创建房间失败:', error);
      throw new Error(`创建房间失败: ${error.message}`);
    }
  };
}
