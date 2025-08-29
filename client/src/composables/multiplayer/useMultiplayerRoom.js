/**
 * 通用多人游戏房间管理组合式函数
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useWebSocket } from '../useWebSocket';

export function useMultiplayerRoom(gameType = 'snake') {
  // 状态管理
  const isConnected = ref(false);
  const error = ref(null);
  const loading = ref(false);
  
  // 房间和玩家状态
  const currentRoom = ref(null);
  const currentPlayer = ref(null);
  const players = ref([]);
  const gameStatus = ref('waiting');
  
  // WebSocket 连接
  const { connect, disconnect, send: sendRaw, onMessage, offMessage, isConnected: wsConnected } = useWebSocket();

  // 统一发送封装（老代码兼容）
  const sendMessage = (type, data) => sendRaw(type, { data });
  
  // 计算属性
  const isHost = computed(() => {
    return currentRoom.value?.created_by === currentPlayer.value?.session_id;
  });
  
  const readyCount = computed(() => {
    return players.value.filter(p => p.is_ready).length;
  });
  
  const allPlayersReady = computed(() => {
    return players.value.length > 0 && readyCount.value === players.value.length;
  });
  
  const canStartGame = computed(() => {
    return isHost.value && allPlayersReady.value && players.value.length >= 1;
  });

  // WebSocket 消息处理器
  // 内置消息处理（基础房间与游戏状态）
  const coreHandlers = {
    // 房间相关消息
    room_joined: (data) => {
      currentRoom.value = data.room;
      currentPlayer.value = data.player;
      players.value = data.players || [];
      error.value = null;
    },
    
    room_left: () => {
      currentRoom.value = null;
      currentPlayer.value = null;
      players.value = [];
      gameStatus.value = 'waiting';
    },
    
    player_joined: (data) => {
      // 更新玩家列表
      if (data.player && !players.value.find(p => p.session_id === data.player.session_id)) {
        players.value.push(data.player);
      }
    },
    
    player_left: (data) => {
      players.value = players.value.filter(p => p.session_id !== data.session_id);
    },
    
    player_ready_changed: (data) => {
      const playerIndex = players.value.findIndex(p => p.session_id === data.session_id);
      if (playerIndex !== -1) {
        players.value[playerIndex].is_ready = data.is_ready;
      }
    },
    
    // 游戏相关消息
    game_started: (data) => {
      gameStatus.value = 'playing';
    },
    
    game_ended: (data) => {
      gameStatus.value = 'finished';
    },
    
    // 错误处理
    error: (data) => {
      error.value = data.message || '发生未知错误';
      loading.value = false;
    }
  };

  // 外部扩展处理器注册表 (event -> Set<handler>)
  const externalHandlers = new Map();

  // 包装统一分发
  const dispatchMessage = (type, payload) => {
    // 核心处理
    if (coreHandlers[type]) coreHandlers[type](payload);
    // 扩展处理
    if (externalHandlers.has(type)) {
      externalHandlers.get(type).forEach(fn => {
        try { fn(payload); } catch (e) { console.error('扩展消息处理器错误', type, e); }
      });
    }
  };

  // 连接与事件绑定
  const connectToServer = async () => {
    try {
      loading.value = true;
      error.value = null;
      await connect();
      isConnected.value = wsConnected.value;
      // 注册核心消息
      Object.keys(coreHandlers).forEach(evt => onMessage(evt, data => dispatchMessage(evt, data)));
    } catch (err) {
      error.value = '连接服务器失败';
      console.error('WebSocket连接失败:', err);
    } finally {
      loading.value = false;
    }
  };

  // 断开连接
  const disconnectFromServer = () => {
  // 移除核心消息监听
  Object.keys(coreHandlers).forEach(evt => offMessage(evt));
  disconnect();
    isConnected.value = false;
    currentRoom.value = null;
    currentPlayer.value = null;
    players.value = [];
  };

  // 创建房间
  const createRoom = async (playerName, roomConfig) => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await fetch(`/api/${gameType}-multiplayer/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_name: playerName,
          ...roomConfig
        })
      });
      
      if (!response.ok) {
        throw new Error('创建房间失败');
      }
      
      const data = await response.json();
      
      // 发送加入房间的 WebSocket 消息
      sendMessage('join_room', {
        room_code: data.room.room_code,
        player_name: playerName
      });
      
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 加入房间
  const joinRoom = async (playerName, roomCode) => {
    try {
      loading.value = true;
      error.value = null;
      
      sendMessage('join_room', {
        room_code: roomCode,
        player_name: playerName
      });
      
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 离开房间
  const leaveRoom = () => {
    if (currentRoom.value) {
      sendMessage('leave_room', {
        room_id: currentRoom.value.id
      });
    }
  };

  // 切换准备状态
  const toggleReady = () => {
    if (currentRoom.value && currentPlayer.value) {
      sendMessage('toggle_ready', {
        room_id: currentRoom.value.id
      });
    }
  };

  // 开始游戏（仅房主）
  const startGame = () => {
    if (canStartGame.value) {
      sendMessage('start_game', {
        room_id: currentRoom.value.id
      });
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // 复制房间码
  const copyRoomCode = async () => {
    if (currentRoom.value?.room_code) {
      try {
        await navigator.clipboard.writeText(currentRoom.value.room_code);
        // 可以添加成功提示
        return true;
      } catch (err) {
        console.error('复制失败:', err);
        return false;
      }
    }
    return false;
  };

  // 获取状态文本
  const getStatusText = (status) => {
    const statusMap = {
      waiting: '等待中',
      playing: '游戏中',
      finished: '已结束',
      paused: '已暂停'
    };
    return statusMap[status] || status;
  };

  // 生命周期
  onMounted(() => {
    connectToServer();
  });

  onUnmounted(() => {
    disconnectFromServer();
  });

  // 对外扩展API
  const registerHandler = (event, handler) => {
    if (!externalHandlers.has(event)) externalHandlers.set(event, new Set());
    externalHandlers.get(event).add(handler);
  };

  const unregisterHandler = (event, handler) => {
    if (externalHandlers.has(event)) {
      externalHandlers.get(event).delete(handler);
      if (externalHandlers.get(event).size === 0) externalHandlers.delete(event);
    }
  };

  return {
    // 状态
    isConnected,
    error,
    loading,
    currentRoom,
    currentPlayer,
    players,
    gameStatus,
    
    // 计算属性
    isHost,
    readyCount,
    allPlayersReady,
    canStartGame,
    
    // 方法
    connectToServer,
    disconnectFromServer,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    formatTime,
    copyRoomCode,
    getStatusText,
    
  // 扩展注册
  registerHandler,
  unregisterHandler,
  coreHandlers
  };
}
