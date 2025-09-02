/**
 * 通用多人游戏房间管理组合式函数
 * 支持任意游戏类型的多人房间管理
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useWebSocket } from '../useWebSocket';

/**
 * 多人游戏房间管理钩子
 * @param {object} options - 配置选项
 * @param {string} options.gameType - 游戏类型 (默认: 'default')
 * @param {string} options.apiPrefix - API前缀 (默认: 根据gameType生成)
 * @param {boolean} options.autoConnect - 是否自动连接 (默认: true)
 * @param {number} options.reconnectDelay - 重连延迟 (默认: 1000ms)
 * @param {object} options.defaultConfig - 默认房间配置
 * @returns {object} 房间管理方法和状态
 */
export function useMultiplayerRoom(options = {}) {
  const {
    gameType = 'default',
    apiPrefix = `/api/${gameType}-multiplayer`,
    autoConnect = true,
    reconnectDelay = 1000,
    defaultConfig = {}
  } = options;

  // 基础状态管理
  const isConnected = ref(false);
  const error = ref(null);
  const loading = ref(false);
  const connecting = ref(false);
  
  // 房间和玩家状态
  const currentRoom = ref(null);
  const currentPlayer = ref(null);
  const players = ref([]);
  const gameStatus = ref('waiting');
  const gameData = ref({}); // 游戏特定数据
  
  // WebSocket 连接
  const { 
    connect, 
    disconnect, 
    send: sendRaw, 
    onMessage, 
    offMessage, 
    isConnected: wsConnected 
  } = useWebSocket();

  // 监听WebSocket连接状态变化
  watch(wsConnected, (connected) => {
    isConnected.value = connected;
    if (!connected && currentRoom.value) {
      // 连接断开时标记为连接中（准备重连）
      connecting.value = true;
      setTimeout(() => {
        if (!wsConnected.value) {
          connectToServer();
        }
      }, reconnectDelay);
    }
  });

  // 统一发送封装
  const sendMessage = (type, data = {}) => {
    try {
      sendRaw(type, { 
        ...data,
        game_type: gameType,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('发送消息失败:', err);
      error.value = '发送消息失败';
    }
  };
  
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
    const minPlayers = currentRoom.value?.game_settings?.minPlayers || 1;
    return isHost.value && 
           allPlayersReady.value && 
           players.value.length >= minPlayers;
  });

  const roomInfo = computed(() => {
    if (!currentRoom.value) return null;
    
    return {
      code: currentRoom.value.room_code,
      mode: currentRoom.value.mode,
      status: currentRoom.value.status,
      playerCount: `${currentRoom.value.current_players}/${currentRoom.value.max_players}`,
      gameType: currentRoom.value.game_type || gameType,
      settings: currentRoom.value.game_settings || {}
    };
  });

  // WebSocket 消息处理器
  const coreHandlers = {
    // 房间相关消息
    room_joined: (data) => {
      console.log(`${gameType} 房间加入成功:`, data);
      currentRoom.value = data.room;
      currentPlayer.value = data.player;
      players.value = data.players || [];
      gameData.value = data.gameData || {};
      error.value = null;
      connecting.value = false;
    },
    
    room_left: (data) => {
      console.log(`${gameType} 房间已离开:`, data);
      currentRoom.value = null;
      currentPlayer.value = null;
      players.value = [];
      gameStatus.value = 'waiting';
      gameData.value = {};
    },
    
    player_joined: (data) => {
      console.log(`${gameType} 玩家加入:`, data.player?.player_name);
      if (data.player && !players.value.find(p => p.session_id === data.player.session_id)) {
        players.value.push(data.player);
      }
      // 更新房间信息
      if (data.room) {
        currentRoom.value = { ...currentRoom.value, ...data.room };
      }
    },
    
    player_left: (data) => {
      console.log(`${gameType} 玩家离开:`, data.player_name);
      players.value = players.value.filter(p => p.session_id !== data.session_id);
      // 更新房间玩家数量
      if (currentRoom.value) {
        currentRoom.value.current_players = data.remaining_count || players.value.length;
      }
    },

    player_reconnected: (data) => {
      console.log(`${gameType} 玩家重连:`, data.player?.player_name);
      const existingIndex = players.value.findIndex(p => p.session_id === data.player.session_id);
      if (existingIndex !== -1) {
        players.value[existingIndex] = { ...players.value[existingIndex], ...data.player };
      }
    },
    
    player_ready_changed: (data) => {
      const playerIndex = players.value.findIndex(p => p.session_id === data.session_id);
      if (playerIndex !== -1) {
        players.value[playerIndex] = { ...players.value[playerIndex], is_ready: data.is_ready };
      }
    },

    host_changed: (data) => {
      console.log(`${gameType} 房主变更:`, data.new_host);
      if (currentRoom.value) {
        currentRoom.value.created_by = data.new_host;
      }
    },
    
    // 游戏相关消息
    game_started: (data) => {
      console.log(`${gameType} 游戏开始:`, data);
      gameStatus.value = 'playing';
      gameData.value = { ...gameData.value, ...data.gameData };
      if (currentRoom.value) {
        currentRoom.value.status = 'playing';
      }
    },
    
    game_ended: (data) => {
      console.log(`${gameType} 游戏结束:`, data);
      gameStatus.value = 'finished';
      gameData.value = { ...gameData.value, result: data.result };
      if (currentRoom.value) {
        currentRoom.value.status = 'finished';
      }
    },

    game_update: (data) => {
      // 游戏状态更新
      gameData.value = { ...gameData.value, ...data };
    },
    
    // 错误处理
    error: (data) => {
      console.error(`${gameType} 错误:`, data);
      error.value = data.message || '发生未知错误';
      loading.value = false;
      connecting.value = false;
    },

    // 房间列表更新
    [`${gameType}_room_list_updated`]: () => {
      // 可以触发房间列表刷新
      console.log(`${gameType} 房间列表已更新`);
    }
  };

  // 外部扩展处理器注册表
  const externalHandlers = new Map();

  // 统一消息分发
  const dispatchMessage = (type, payload) => {
    // 核心处理
    if (coreHandlers[type]) {
      try {
        coreHandlers[type](payload);
      } catch (err) {
        console.error(`核心消息处理器错误 [${type}]:`, err);
      }
    }
    
    // 扩展处理
    if (externalHandlers.has(type)) {
      externalHandlers.get(type).forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`扩展消息处理器错误 [${type}]:`, err);
        }
      });
    }
  };

  // 连接与事件绑定
  const connectToServer = async () => {
    if (connecting.value || isConnected.value) return;
    
    try {
      connecting.value = true;
      loading.value = true;
      error.value = null;
      
      await connect();
      isConnected.value = wsConnected.value;
      
      // 注册所有消息处理器
      Object.keys(coreHandlers).forEach(event => {
        onMessage(event, data => dispatchMessage(event, data));
      });
      
      console.log(`${gameType} WebSocket连接成功`);
    } catch (err) {
      error.value = '连接服务器失败';
      console.error(`${gameType} WebSocket连接失败:`, err);
    } finally {
      loading.value = false;
      connecting.value = false;
    }
  };

  // 断开连接
  const disconnectFromServer = () => {
    try {
      // 移除所有消息监听
      Object.keys(coreHandlers).forEach(event => {
        try {
          offMessage(event);
        } catch (err) {
          console.warn(`移除消息监听失败 [${event}]:`, err);
        }
      });
      
      disconnect();
      isConnected.value = false;
      currentRoom.value = null;
      currentPlayer.value = null;
      players.value = [];
      gameData.value = {};
      connecting.value = false;
      
      console.log(`${gameType} WebSocket已断开`);
    } catch (err) {
      console.error(`${gameType} 断开连接失败:`, err);
    }
  };

  // API 请求封装
  const apiRequest = async (endpoint, options = {}) => {
    const url = `${apiPrefix}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };

  // 创建房间
  const createRoom = async (playerName, roomConfig = {}) => {
    try {
      loading.value = true;
      error.value = null;
      
      const config = { ...defaultConfig, ...roomConfig };
      const data = await apiRequest('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          player_name: playerName,
          game_type: gameType,
          ...config
        })
      });
      
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

  // 快速加入房间
  const quickJoin = async (playerName, mode = null) => {
    try {
      loading.value = true;
      error.value = null;
      
      const data = await apiRequest('/rooms/quick-join', {
        method: 'POST',
        body: JSON.stringify({
          player_name: playerName,
          mode,
          game_type: gameType
        })
      });
      
      if (data.room) {
        // 加入已存在的房间
        sendMessage('join_room', {
          room_code: data.room.room_code,
          player_name: playerName
        });
      } else {
        // 创建新房间
        return createRoom(playerName, { mode });
      }
      
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 获取房间列表
  const getRoomList = async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams({
        game_type: gameType,
        ...filters
      });
      
      return await apiRequest(`/rooms?${queryParams}`);
    } catch (err) {
      console.error('获取房间列表失败:', err);
      throw err;
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

  // 发送游戏消息
  const sendGameMessage = (type, data = {}) => {
    if (currentRoom.value) {
      sendMessage(type, {
        room_id: currentRoom.value.id,
        ...data
      });
    }
  };

  // 工具方法
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const copyRoomCode = async () => {
    if (currentRoom.value?.room_code) {
      try {
        await navigator.clipboard.writeText(currentRoom.value.room_code);
        return true;
      } catch (err) {
        console.error('复制失败:', err);
        return false;
      }
    }
    return false;
  };

  const getStatusText = (status) => {
    const statusMap = {
      waiting: '等待中',
      playing: '游戏中',
      finished: '已结束',
      paused: '已暂停'
    };
    return statusMap[status] || status;
  };

  // stats/leaderboard API removed

  // 生命周期
  onMounted(() => {
    if (autoConnect) {
      connectToServer();
    }
  });

  onUnmounted(() => {
    disconnectFromServer();
  });

  // 扩展API - 用于注册自定义消息处理器
  const registerHandler = (event, handler) => {
    if (!externalHandlers.has(event)) {
      externalHandlers.set(event, new Set());
    }
    externalHandlers.get(event).add(handler);
    
    // 如果已连接，立即注册WebSocket监听
    if (isConnected.value) {
      onMessage(event, data => dispatchMessage(event, data));
    }
  };

  const unregisterHandler = (event, handler) => {
    if (externalHandlers.has(event)) {
      externalHandlers.get(event).delete(handler);
      if (externalHandlers.get(event).size === 0) {
        externalHandlers.delete(event);
        // 如果没有其他处理器，移除WebSocket监听
        if (!coreHandlers[event]) {
          offMessage(event);
        }
      }
    }
  };

  // 重置状态
  const reset = () => {
    currentRoom.value = null;
    currentPlayer.value = null;
    players.value = [];
    gameStatus.value = 'waiting';
    gameData.value = {};
    error.value = null;
    loading.value = false;
  };

  return {
    // 状态
    isConnected,
    connecting,
    error,
    loading,
    currentRoom,
    currentPlayer,
    players,
    gameStatus,
    gameData,
    
    // 计算属性
    isHost,
    readyCount,
    allPlayersReady,
    canStartGame,
    roomInfo,
    
    // 连接管理
    connectToServer,
    disconnectFromServer,
    
    // 房间操作
    createRoom,
    joinRoom,
    quickJoin,
    leaveRoom,
    getRoomList,
    
    // 游戏操作
    toggleReady,
    startGame,
    sendGameMessage,
    
  
    
    // 工具方法
    formatTime,
    copyRoomCode,
    getStatusText,
    
    // 扩展API
    registerHandler,
    unregisterHandler,
    sendMessage,
    reset,
    
    // 配置
    gameType,
    apiPrefix
  };
}