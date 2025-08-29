/**
 * 贪吃蛇多人游戏组合式函数
 */
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useWebSocket } from './useWebSocket.js';

export function useSnakeMultiplayer() {
  const { ws, isConnected, connect, disconnect, send } = useWebSocket();

  // 响应式状态
  const isInRoom = ref(false);
  const currentRoom = ref(null);
  const currentPlayer = ref(null);
  const players = ref([]);
  const gameState = ref(null);
  const gameStatus = ref('lobby'); // 'lobby', 'waiting', 'playing', 'finished'
  const error = ref(null);
  const loading = ref(false);

  // 投票相关状态
  const votes = ref({});
  const voteTimeout = ref(0);
  const voteTimer = ref(null);
  const myVote = ref(null);

  // 统计信息
  const playerStats = ref(null);
  const leaderboard = ref([]);

  // 计算属性
  const canStart = computed(() => {
    const readyPlayers = players.value.filter(p => p.is_ready);
    return readyPlayers.length >= 2 && readyPlayers.length === players.value.length;
  });

  const isReady = computed(() => {
    return currentPlayer.value?.is_ready || false;
  });

  const isGameHost = computed(() => {
    return currentRoom.value?.created_by === currentPlayer.value?.session_id;
  });

  // WebSocket消息处理
  const messageHandlers = {
    // 房间相关
    snake_room_created: handleRoomCreated,
    snake_room_joined: handleRoomJoined,
    snake_room_left: handleRoomLeft,
    snake_room_info: handleRoomInfo,
    
    // 玩家相关
    snake_player_joined: handlePlayerJoined,
    snake_player_left: handlePlayerLeft,
    snake_player_ready_changed: handlePlayerReadyChanged,
    snake_ready_toggled: handleReadyToggled,
    
    // 游戏相关
    snake_game_started: handleGameStarted,
    snake_game_update: handleGameUpdate,
    snake_competitive_update: handleCompetitiveUpdate,
    snake_game_ended: handleGameEnded,
    
    // 投票相关
    snake_vote_updated: handleVoteUpdated,
    snake_vote_timeout: handleVoteTimeout,
    
    // 自动弹出
    snake_auto_popup: handleAutoPopup,
    
    // 错误处理
    snake_error: handleError
  };

  // 初始化WebSocket连接
  const init = async () => {
    try {
      loading.value = true;
      await connect();
      
      // 注册消息处理器
      Object.entries(messageHandlers).forEach(([type, handler]) => {
        ws.value?.addEventListener('message', (event) => {
          const message = JSON.parse(event.data);
          if (message.type === type) {
            handler(message.data);
          }
        });
      });
      
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  // 创建房间
  const createRoom = async (playerName, mode, gameSettings = {}) => {
    try {
      loading.value = true;
      error.value = null;
      
      send({
        type: 'snake_create_room',
        data: {
          playerName,
          mode,
          gameSettings
        }
      });
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  // 加入房间
  const joinRoom = async (playerName, roomCode) => {
    try {
      loading.value = true;
      error.value = null;
      
      send({
        type: 'snake_join_room',
        data: {
          playerName,
          roomCode: roomCode.toUpperCase()
        }
      });
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  // 切换准备状态
  const toggleReady = () => {
    if (!currentRoom.value) return;
    
    send({
      type: 'snake_toggle_ready',
      data: {
        roomCode: currentRoom.value.room_code
      }
    });
  };

  // 投票（共享模式）
  const vote = (direction) => {
    if (!currentRoom.value || currentRoom.value.mode !== 'shared') return;
    
    myVote.value = direction;
    
    send({
      type: 'snake_vote',
      data: {
        roomCode: currentRoom.value.room_code,
        direction
      }
    });
  };

  // 移动（竞技模式）
  const move = (direction) => {
    if (!currentRoom.value || currentRoom.value.mode !== 'competitive') return;
    
    send({
      type: 'snake_move',
      data: {
        roomCode: currentRoom.value.room_code,
        direction
      }
    });
  };

  // 离开房间
  const leaveRoom = () => {
    if (!currentRoom.value) return;
    
    send({
      type: 'snake_leave_room',
      data: {
        roomCode: currentRoom.value.room_code
      }
    });
    
    resetRoomState();
  };

  // 获取房间信息
  const getRoomInfo = (roomCode) => {
    send({
      type: 'snake_get_room_info',
      data: {
        roomCode: roomCode.toUpperCase()
      }
    });
  };

  // 消息处理函数
  function handleRoomCreated(data) {
    currentRoom.value = data.room;
    currentPlayer.value = data.player;
    players.value = [data.player];
    isInRoom.value = true;
    gameStatus.value = 'waiting';
    loading.value = false;
  }

  function handleRoomJoined(data) {
    currentRoom.value = data.room;
    currentPlayer.value = data.player;
    isInRoom.value = true;
    gameStatus.value = 'waiting';
    loading.value = false;
    
    // 获取房间完整信息
    getRoomInfo(data.room.room_code);
  }

  function handleRoomLeft() {
    resetRoomState();
    loading.value = false;
  }

  function handleRoomInfo(data) {
    if (data) {
      currentRoom.value = data.room;
      players.value = data.players || [];
      gameState.value = data.game_state;
      
      if (data.room?.status === 'playing') {
        gameStatus.value = 'playing';
      } else {
        gameStatus.value = 'waiting';
      }
    }
  }

  function handlePlayerJoined(data) {
    if (data.player && !players.value.find(p => p.session_id === data.player.session_id)) {
      players.value.push(data.player);
    }
    if (data.room) {
      currentRoom.value = data.room;
    }
  }

  function handlePlayerLeft(data) {
    if (data.player) {
      players.value = players.value.filter(p => p.session_id !== data.player.session_id);
    }
  }

  function handlePlayerReadyChanged(data) {
    if (data.player) {
      const playerIndex = players.value.findIndex(p => p.session_id === data.player.session_id);
      if (playerIndex >= 0) {
        players.value[playerIndex] = data.player;
      }
    }
    
    // 如果可以开始游戏，更新状态
    if (data.can_start) {
      gameStatus.value = 'starting';
    }
  }

  function handleReadyToggled(data) {
    currentPlayer.value = data;
  }

  function handleGameStarted(data) {
    gameState.value = data.game_state;
    players.value = data.players || players.value;
    gameStatus.value = 'playing';
    
    // 清除投票状态
    votes.value = {};
    myVote.value = null;
  }

  function handleGameUpdate(data) {
    if (gameState.value) {
      // 更新共享模式游戏状态
      Object.assign(gameState.value, {
        sharedSnake: data.shared_snake,
        food: data.food
      });
    }
    
    // 清除投票状态，准备下一轮投票
    votes.value = {};
    myVote.value = null;
  }

  function handleCompetitiveUpdate(data) {
    if (gameState.value) {
      // 更新竞技模式游戏状态
      Object.assign(gameState.value, {
        snakes: data.snakes,
        food: data.food
      });
    }
  }

  function handleGameEnded(data) {
    gameStatus.value = 'finished';
    
    if (gameState.value) {
      gameState.value.gameOver = true;
      gameState.value.winner = data.winner;
    }
    
    // 清除计时器
    if (voteTimer.value) {
      clearInterval(voteTimer.value);
      voteTimer.value = null;
    }
  }

  function handleVoteUpdated(data) {
    votes.value = data.votes || {};
  }

  function handleVoteTimeout() {
    // 投票时间结束
    voteTimeout.value = 0;
    if (voteTimer.value) {
      clearInterval(voteTimer.value);
      voteTimer.value = null;
    }
  }

  function handleAutoPopup(data) {
    // 触发自动弹出事件
    window.dispatchEvent(new CustomEvent('snakeAutoPopup', {
      detail: data
    }));
  }

  function handleError(data) {
    error.value = data.message;
    loading.value = false;
  }

  // 重置房间状态
  const resetRoomState = () => {
    isInRoom.value = false;
    currentRoom.value = null;
    currentPlayer.value = null;
    players.value = [];
    gameState.value = null;
    gameStatus.value = 'lobby';
    votes.value = {};
    myVote.value = null;
    voteTimeout.value = 0;
    
    if (voteTimer.value) {
      clearInterval(voteTimer.value);
      voteTimer.value = null;
    }
  };

  // 启动投票倒计时
  const startVoteCountdown = () => {
    voteTimeout.value = 3; // 3秒倒计时
    voteTimer.value = setInterval(() => {
      voteTimeout.value--;
      if (voteTimeout.value <= 0) {
        clearInterval(voteTimer.value);
        voteTimer.value = null;
      }
    }, 1000);
  };

  // 清理资源
  const cleanup = () => {
    if (voteTimer.value) {
      clearInterval(voteTimer.value);
      voteTimer.value = null;
    }
    
    resetRoomState();
    disconnect();
  };

  // 生命周期
  onMounted(() => {
    init();
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    // 状态
    isConnected,
    isInRoom,
    currentRoom,
    currentPlayer,
    players,
    gameState,
    gameStatus,
    error,
    loading,
    votes,
    voteTimeout,
    myVote,
    playerStats,
    leaderboard,
    
    // 计算属性
    canStart,
    isReady,
    isGameHost,
    
    // 方法
    init,
    createRoom,
    joinRoom,
    toggleReady,
    vote,
    move,
    leaveRoom,
    getRoomInfo,
    resetRoomState,
    startVoteCountdown,
    cleanup
  };
}
