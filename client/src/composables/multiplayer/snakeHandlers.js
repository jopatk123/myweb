// 消息处理器：与 WebSocket 消息类型一一对应
// 通过依赖注入获取状态 & 方法，易于测试
export function createSnakeHandlers(ctx) {
  const {
    state,
    events,
    utils: { resetRoomState, clearVoteTimer },
    refs: { currentRoom, currentPlayer, players, gameState, gameStatus, error, votes, myVote, voteTimeout, voteTimer },
  } = ctx;

  function handleRoomCreated(data) {
    // 双向兼容字段 (room_code <-> roomCode)
    if (data?.room) {
      if (data.room.room_code && !data.room.roomCode) data.room.roomCode = data.room.room_code;
      if (data.room.roomCode && !data.room.room_code) data.room.room_code = data.room.roomCode;
    }
    currentRoom.value = data.room;
    currentPlayer.value = data.player;
    players.value = [data.player];
    state.isInRoom.value = true;
    gameStatus.value = 'waiting';
    state.loading.value = false;
    const code = data.room?.room_code || data.room?.roomCode;
    if (code) {
      localStorage.setItem('snakeCurrentRoomCode', code);
      // 立即再次获取房间信息，确保所有字段齐全（防止早期导航时缺字段）
      try { ctx.api.getRoomInfo(code); } catch (e) { /* ignore */ }
    }
  }

  function handleRoomJoined(data) {
    if (data?.room) {
      if (data.room.room_code && !data.room.roomCode) data.room.roomCode = data.room.room_code;
      if (data.room.roomCode && !data.room.room_code) data.room.room_code = data.room.roomCode;
    }
    currentRoom.value = data.room;
    currentPlayer.value = data.player;
    state.isInRoom.value = true;
    gameStatus.value = 'waiting';
    state.loading.value = false;
    // 请求完整信息
    const code = data.room?.room_code || data.room?.roomCode;
    if (code) {
      ctx.api.getRoomInfo(code);
      localStorage.setItem('snakeCurrentRoomCode', code);
    }
  }

  function handleRoomLeft() {
    resetRoomState();
    state.loading.value = false;
  }

  function handleRoomInfo(data) {
    if (!data) return;
    if (data?.room) {
      if (data.room.room_code && !data.room.roomCode) data.room.roomCode = data.room.room_code;
      if (data.room.roomCode && !data.room.room_code) data.room.room_code = data.room.roomCode;
    }
    currentRoom.value = data.room;
    players.value = data.players || [];
    gameState.value = data.game_state;
    gameStatus.value = data.room?.status === 'playing' ? 'playing' : 'waiting';
    const code = data.room?.room_code || data.room?.roomCode;
    if (code) localStorage.setItem('snakeCurrentRoomCode', code);
  }

  function handlePlayerJoined(data) {
    if (data.player && !players.value.find(p => p.session_id === data.player.session_id)) {
      players.value.push(data.player);
    }
    if (data.room) {
      if (data.room.room_code && !data.room.roomCode) data.room.roomCode = data.room.room_code;
      if (data.room.roomCode && !data.room.room_code) data.room.room_code = data.room.roomCode;
      currentRoom.value = data.room;
      
      // 如果房间正在游戏中，更新游戏状态
      if (data.room.status === 'playing') {
        gameStatus.value = 'playing';
      }
    }
    events.emitPlayerJoin(data);
  }

  function handlePlayerLeft(data) {
    if (data.player) {
      players.value = players.value.filter(p => p.session_id !== data.player.session_id);
    }
    events.emitPlayerLeave(data);
  }

  function handlePlayerReadyChanged(data) {
    if (data.player) {
      const idx = players.value.findIndex(p => p.session_id === data.player.session_id);
      if (idx >= 0) players.value[idx] = data.player;
    }
    if (data.can_start) gameStatus.value = 'starting';
    events.emitPlayerReady(data);
  }

  function handleReadyToggled(data) { currentPlayer.value = data; }

  async function handleGameStarted(data) {
    // 某些情况下服务器可能只广播了事件类型而没有包含完整 payload，做容错处理
    if (!data || !data.game_state) {
      try {
        const code = currentRoom.value?.room_code || currentRoom.value?.roomCode;
        if (code && ctx.api && ctx.api.getRoomInfo) {
          const info = await ctx.api.getRoomInfo(code);
          gameState.value = info?.game_state || null;
          players.value = info?.players || players.value;
        } else {
          // 无法获取 room 信息，则保持现有状态并返回
          console.warn('handleGameStarted: missing game_state and cannot fetch room info');
          return;
        }
      } catch (e) {
        console.error('handleGameStarted: fallback getRoomInfo failed', e && e.message);
        return;
      }
    } else {
      gameState.value = data.game_state;
      players.value = data.players || players.value;
    }

    gameStatus.value = 'playing';
    votes.value = {}; myVote.value = null; clearVoteTimer();
    events.emitGameUpdate(data);
  }

  function handleGameUpdate(data) {
    // 兼容：可能服务端直接给 game_state 对象或分散字段
    if (!gameState.value && data.game_state) {
      gameState.value = data.game_state;
    }
    if (gameState.value) {
      if (data.game_state) {
        Object.assign(gameState.value, data.game_state);
      }
      if (data.shared_snake) gameState.value.sharedSnake = data.shared_snake;
      if (data.food) gameState.value.food = data.food;
    }
    votes.value = {}; myVote.value = null; clearVoteTimer();
    events.emitGameUpdate(data);
  }

  function handleCompetitiveUpdate(data) {
    if (!gameState.value) {
      gameState.value = data.game_state || { mode: 'competitive' };
    }
    if (data.game_state) Object.assign(gameState.value, data.game_state);
    if (data.snakes) gameState.value.snakes = data.snakes;
    if (data.foods) gameState.value.foods = data.foods;
  }

  function handleGameEnded(data) {
    gameStatus.value = 'finished';
    if (gameState.value) {
      if (data.game_state) {
        Object.assign(gameState.value, data.game_state);
      }
      gameState.value.status = 'finished';
      gameState.value.gameOver = true;
      gameState.value.winner = data.winner || data.game_state?.winner || gameState.value.winner || null;
      gameState.value.endReason = data.reason;
      if (!gameState.value.endTime) gameState.value.endTime = Date.now();
    }
    clearVoteTimer();
  }

  function handleGameReset(data) {
    gameStatus.value = 'waiting';
    gameState.value = data.game_state;
    votes.value = {}; myVote.value = null; clearVoteTimer();
    console.log('游戏已重置，可以重新开始');
  }

  function handleVoteUpdated(data) {
    votes.value = data.votes || {};
    events.emitVoteUpdate(data);
  }

  function handleVoteTimeout() {
    voteTimeout.value = 0; clearVoteTimer();
  }

  function handleAutoPopup(data) { events.emitAutoPopup(data); }

  function handleError(data) { error.value = data.message; state.loading.value = false; }

  // WebSocket 服务端 broadcastToRoom 会自动加前缀 snake_，我们监听的键需要与其一致
  return {
    snake_room_created: handleRoomCreated,
    snake_room_joined: handleRoomJoined,
    snake_room_left: handleRoomLeft,
    snake_room_info: handleRoomInfo,
    snake_player_joined: handlePlayerJoined,
    snake_player_left: handlePlayerLeft,
    snake_player_ready_changed: handlePlayerReadyChanged,
    snake_ready_toggled: handleReadyToggled,
    snake_game_started: handleGameStarted, // game_started
    snake_game_update: handleGameUpdate,   // game_update
    snake_competitive_update: handleCompetitiveUpdate, // competitive_update
    snake_game_ended: handleGameEnded,     // game_ended
    snake_game_reset: handleGameReset,     // game_reset
    snake_vote_updated: handleVoteUpdated, // vote_updated
    snake_vote_timeout: handleVoteTimeout,
    snake_auto_popup: handleAutoPopup,
    snake_error: handleError,
  };
}
