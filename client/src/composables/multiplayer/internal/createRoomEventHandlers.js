export function createRoomEventHandlers({
  gameType,
  currentRoom,
  currentPlayer,
  players,
  gameStatus,
  gameData,
  error,
  connecting,
  loading,
}) {
  return {
    room_joined: data => {
      console.log(`${gameType} 房间加入成功:`, data);
      currentRoom.value = data.room;
      currentPlayer.value = data.player;
      players.value = data.players || [];
      gameData.value = data.gameData || {};
      error.value = null;
      connecting.value = false;
    },

    room_left: data => {
      console.log(`${gameType} 房间已离开:`, data);
      currentRoom.value = null;
      currentPlayer.value = null;
      players.value = [];
      gameStatus.value = 'waiting';
      gameData.value = {};
    },

    player_joined: data => {
      console.log(`${gameType} 玩家加入:`, data.player?.player_name);
      if (
        data.player &&
        !players.value.find(p => p.session_id === data.player.session_id)
      ) {
        players.value = [...players.value, data.player];
      }
      if (data.room) {
        currentRoom.value = { ...currentRoom.value, ...data.room };
      }
    },

    player_left: data => {
      console.log(`${gameType} 玩家离开:`, data.player_name);
      players.value = players.value.filter(
        p => p.session_id !== data.session_id
      );
      if (currentRoom.value) {
        currentRoom.value.current_players =
          data.remaining_count || players.value.length;
      }
    },

    player_reconnected: data => {
      console.log(`${gameType} 玩家重连:`, data.player?.player_name);
      const existingIndex = players.value.findIndex(
        p => p.session_id === data.player.session_id
      );
      if (existingIndex !== -1) {
        const updated = [...players.value];
        updated[existingIndex] = { ...updated[existingIndex], ...data.player };
        players.value = updated;
      }
    },

    player_ready_changed: data => {
      const playerIndex = players.value.findIndex(
        p => p.session_id === data.session_id
      );
      if (playerIndex !== -1) {
        const updated = [...players.value];
        updated[playerIndex] = {
          ...updated[playerIndex],
          is_ready: data.is_ready,
        };
        players.value = updated;
      }
    },

    host_changed: data => {
      console.log(`${gameType} 房主变更:`, data.new_host);
      if (currentRoom.value) {
        currentRoom.value = { ...currentRoom.value, created_by: data.new_host };
      }
    },

    game_started: data => {
      console.log(`${gameType} 游戏开始:`, data);
      gameStatus.value = 'playing';
      gameData.value = { ...gameData.value, ...data.gameData };
      if (currentRoom.value) {
        currentRoom.value = { ...currentRoom.value, status: 'playing' };
      }
    },

    game_ended: data => {
      console.log(`${gameType} 游戏结束:`, data);
      gameStatus.value = 'finished';
      gameData.value = { ...gameData.value, result: data.result };
      if (currentRoom.value) {
        currentRoom.value = { ...currentRoom.value, status: 'finished' };
      }
    },

    game_update: data => {
      gameData.value = { ...gameData.value, ...data };
    },

    error: data => {
      console.error(`${gameType} 错误:`, data);
      error.value = data.message || '发生未知错误';
      loading.value = false;
      connecting.value = false;
    },

    [`${gameType}_room_list_updated`]: () => {
      console.log(`${gameType} 房间列表已更新`);
    },
  };
}
