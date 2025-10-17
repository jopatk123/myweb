// 加入/离开房间相关逻辑
export function joinLeaveRoomFactory(Service) {
  // 加入房间
  Service.prototype.joinRoom = function (sessionId, playerName, roomCode) {
    try {
      const room = this.RoomModel.findByRoomCode(roomCode);
      if (!room) throw new Error('房间不存在');
      if (room.game_type && room.game_type !== this.getGameType()) {
        throw new Error(
          `房间类型不匹配: 期望 ${this.getGameType()}, 实际 ${room.game_type}`
        );
      }
      if (room.status === 'finished') throw new Error('游戏已结束');
      const isSnakeSharedMode =
        this.getGameType() === 'snake' && room.mode === 'shared';
      if (room.status === 'playing' && !isSnakeSharedMode)
        throw new Error('游戏正在进行中，无法加入');
      const existingPlayer = this.PlayerModel.findByRoomAndSession(
        room.id,
        sessionId
      );
      if (existingPlayer) {
        this.PlayerModel.update(existingPlayer.id, {
          is_online: true,
          last_active: new Date().toISOString(),
        });
        const players = this.PlayerModel.findOnlineByRoomId(room.id);
        this.broadcastToRoom(room.id, 'player_reconnected', {
          player: existingPlayer,
          room_id: room.id,
        });
        return { room, player: existingPlayer, players };
      }
      const currentPlayers = this.PlayerModel.getPlayerCount(room.id);
      if (currentPlayers >= room.max_players) throw new Error('房间已满');
      const playerColor = this.getNextPlayerColor(room.id, currentPlayers);
      const player = this.PlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false,
      });
      this.RoomModel.update(room.id, { current_players: currentPlayers + 1 });
      const players = this.PlayerModel.findOnlineByRoomId(room.id);
      this.broadcastToRoom(room.id, 'player_joined', {
        player,
        room_id: room.id,
        players,
        room,
      });
      console.log(
        `玩家 ${playerName} 加入 ${this.getGameType()} 房间: ${roomCode} (状态: ${room.status})`
      );
      return { room, player, players };
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  };

  // 离开房间
  Service.prototype.leaveRoom = function (sessionId, roomId) {
    try {
      const player = this.PlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) throw new Error('玩家不在房间中');
      const room = this.RoomModel.findById(roomId);
      if (!room) throw new Error('房间不存在');
      this.PlayerModel.deleteBySession(sessionId);
      const remainingPlayers = this.PlayerModel.getPlayerCount(roomId);
      this.RoomModel.update(roomId, { current_players: remainingPlayers });
      this.broadcastToRoom(roomId, 'player_left', {
        session_id: sessionId,
        player_name: player.player_name,
        room_id: roomId,
        remaining_count: remainingPlayers,
      });
      // 如果房间已空则清理房间；否则如果离开者是房主则转移房主
      if (remainingPlayers === 0) {
        this.cleanupRoom(roomId);
      } else if (room.created_by === sessionId) {
        this.transferHostRole(roomId);
      }
      console.log(`玩家 ${player.player_name} 离开 ${this.getGameType()} 房间`);
      return { success: true };
    } catch (error) {
      console.error('离开房间失败:', error);
      throw error;
    }
  };

  // 转移房主
  Service.prototype.transferHostRole = function (roomId) {
    try {
      const players = this.PlayerModel.findOnlineByRoomId(roomId);
      if (players.length > 0) {
        const newHost = players[0];
        this.RoomModel.update(roomId, { created_by: newHost.session_id });
        this.broadcastToRoom(roomId, 'host_changed', {
          new_host: newHost.session_id,
          room_id: roomId,
        });
        console.log(`房间 ${roomId} 房主已转移给 ${newHost.player_name}`);
      }
    } catch (error) {
      console.error('转移房主权限失败:', error);
    }
  };
}
