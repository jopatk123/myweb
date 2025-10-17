// 玩家状态及准备/开始/结束游戏相关逻辑
export function playerStatusFactory(Service) {
  Service.prototype.togglePlayerReady = function (sessionId, roomId) {
    try {
      const player = this.PlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) throw new Error('玩家不在房间中');
      const newReadyStatus = !player.is_ready;
      this.PlayerModel.update(player.id, {
        is_ready: newReadyStatus,
        last_active: new Date().toISOString(),
      });
      const updatedPlayer = this.PlayerModel.findByRoomAndSession(
        roomId,
        sessionId
      );
      this.broadcastToRoom(roomId, 'player_ready_changed', {
        session_id: sessionId,
        is_ready: newReadyStatus,
        player: updatedPlayer,
      });
      return updatedPlayer;
    } catch (error) {
      console.error('切换准备状态失败:', error);
      throw error;
    }
  };

  Service.prototype.checkAllPlayersReady = function (roomId) {
    try {
      const players = this.PlayerModel.findOnlineByRoomId(roomId);
      const readyCount = players.filter(p => p.is_ready).length;
      const totalPlayers = players.length;
      const minPlayers = this.options.defaultGameConfig.minPlayers;
      return {
        allReady:
          readyCount > 0 &&
          readyCount === totalPlayers &&
          totalPlayers >= minPlayers,
        readyCount,
        totalPlayers,
        minPlayers,
        players,
      };
    } catch (error) {
      console.error('检查玩家准备状态失败:', error);
      return {
        allReady: false,
        readyCount: 0,
        totalPlayers: 0,
        minPlayers: 1,
        players: [],
      };
    }
  };

  Service.prototype.startGame = function (roomId, hostSessionId) {
    try {
      const room = this.RoomModel.findById(roomId);
      if (!room) throw new Error('房间不存在');
      if (room.created_by !== hostSessionId)
        throw new Error('只有房主可以开始游戏');
      const players = this.PlayerModel.findOnlineByRoomId(roomId);
      const isSnakeSharedMode =
        this.getGameType() === 'snake' && room.mode === 'shared';
      if (isSnakeSharedMode) {
        if (players.length < 1) throw new Error('至少需要1名玩家才能开始游戏');
        console.log(
          `贪吃蛇共享模式开始: 房间 ${roomId}, 玩家数: ${players.length}, 无需等待准备`
        );
      } else {
        const readyCheck = this.checkAllPlayersReady(roomId);
        if (!readyCheck.allReady)
          throw new Error(
            `还有玩家未准备就绪 (${readyCheck.readyCount}/${readyCheck.totalPlayers})`
          );
      }
      this.RoomModel.update(roomId, { status: 'playing' });
      this.updateGameState(roomId, {
        status: 'playing',
        startTime: Date.now(),
      });
      this.broadcastToRoom(roomId, 'game_started', {
        room_id: roomId,
        players,
        start_time: Date.now(),
      });
      console.log(`${this.getGameType()} 游戏开始: 房间 ${roomId}`);
      return { success: true, players };
    } catch (error) {
      console.error('开始游戏失败:', error);
      throw error;
    }
  };

  Service.prototype.endGame = function (roomId, gameResult = {}) {
    try {
      this.RoomModel.update(roomId, {
        status: 'finished',
        ended_at: new Date().toISOString(),
      });
      this.updateGameState(roomId, {
        status: 'finished',
        endTime: Date.now(),
        result: gameResult,
      });
      this.broadcastToRoom(roomId, 'game_ended', {
        room_id: roomId,
        result: gameResult,
        end_time: Date.now(),
      });
      console.log(`${this.getGameType()} 游戏结束: 房间 ${roomId}`, gameResult);
      setTimeout(() => {
        this.cleanupRoom(roomId);
      }, 10000);
    } catch (error) {
      console.error('结束游戏失败:', error);
    }
  };
}
