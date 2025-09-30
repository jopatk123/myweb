/**
 * 通用多人游戏房间管理组合式函数
 * 支持任意游戏类型的多人房间管理
 */
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useWebSocket } from '../useWebSocket';
import { createRoomState } from './internal/createRoomState.js';
import { createMessageDispatcher } from './internal/createMessageDispatcher.js';
import { createRoomEventHandlers } from './internal/createRoomEventHandlers.js';
import { createRoomApiClient } from './internal/createRoomApiClient.js';
import { createMessageRegistry } from './internal/createMessageRegistry.js';

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
    apiPrefix,
    autoConnect = true,
    reconnectDelay = 1000,
    defaultConfig = {},
  } = options;

  // --- 状态管理 ---
  const {
    isConnected,
    error,
    loading,
    connecting,
    currentRoom,
    currentPlayer,
    players,
    gameStatus,
    gameData,
    resetState,
  } = createRoomState();

  // --- WebSocket 与消息分发 ---
  const {
    connect,
    disconnect,
    send: sendRaw,
    onMessage,
    offMessage,
    isConnected: wsConnected,
  } = useWebSocket();

  const sendMessage = createMessageDispatcher({
    sendRaw,
    gameType,
    error,
  });

  const coreHandlers = createRoomEventHandlers({
    gameType,
    currentRoom,
    currentPlayer,
    players,
    gameStatus,
    gameData,
    error,
    connecting,
    loading,
  });

  const coreEvents = new Set(Object.keys(coreHandlers));
  const messageRegistry = createMessageRegistry();
  const activeListeners = new Map();

  const dispatchMessage = (type, payload) => {
    if (coreHandlers[type]) {
      try {
        coreHandlers[type](payload);
      } catch (err) {
        console.error(`核心消息处理器错误 [${type}]:`, err);
      }
    }

    messageRegistry.dispatch(type, payload);
  };

  const bindListener = event => {
    if (activeListeners.has(event)) return;
    const handler = data => dispatchMessage(event, data);
    onMessage(event, handler);
    activeListeners.set(event, handler);
  };

  const unbindListener = event => {
    if (!activeListeners.has(event)) return;
    const handler = activeListeners.get(event);
    try {
      offMessage(event, handler);
    } catch (err) {
      console.warn(`移除消息监听失败 [${event}]:`, err);
    }
    activeListeners.delete(event);
  };

  const bindAllListeners = () => {
    coreEvents.forEach(bindListener);
    messageRegistry.getEvents().forEach(bindListener);
  };

  const unbindAllListeners = () => {
    Array.from(activeListeners.keys()).forEach(unbindListener);
  };

  const scheduleReconnect = () => {
    connecting.value = true;
    setTimeout(() => {
      if (!wsConnected.value) {
        connectToServer();
      }
    }, reconnectDelay);
  };

  watch(wsConnected, connected => {
    isConnected.value = connected;
    if (!connected && currentRoom.value) {
      scheduleReconnect();
    }
  });

  // --- API 客户端 ---
  const { normalizedApiPrefix, createRoom, joinRoom, getRoomList } =
    createRoomApiClient({
      gameType,
      apiPrefix,
      defaultConfig,
      loading,
      error,
      sendMessage,
    });

  // --- 连接管理 ---
  const connectToServer = async () => {
    if (connecting.value || isConnected.value) return;

    try {
      connecting.value = true;
      loading.value = true;
      error.value = null;

      await connect();
      isConnected.value = wsConnected.value;

      bindAllListeners();

      console.log(`${gameType} WebSocket连接成功`);
    } catch (err) {
      error.value = '连接服务器失败';
      console.error(`${gameType} WebSocket连接失败:`, err);
    } finally {
      loading.value = false;
      connecting.value = false;
    }
  };

  const disconnectFromServer = () => {
    try {
      unbindAllListeners();
      disconnect();
      isConnected.value = false;
      resetState();
      connecting.value = false;
      console.log(`${gameType} WebSocket已断开`);
    } catch (err) {
      console.error(`${gameType} 断开连接失败:`, err);
    }
  };

  // --- 房间操作 ---
  const leaveRoom = () => {
    if (currentRoom.value) {
      sendMessage('leave_room', {
        room_id: currentRoom.value.id,
      });
    }
  };

  // 切换准备状态
  const toggleReady = () => {
    if (currentRoom.value && currentPlayer.value) {
      sendMessage('toggle_ready', {
        room_id: currentRoom.value.id,
      });
    }
  };

  // 开始游戏（仅房主）
  const startGame = () => {
    if (canStartGame.value) {
      sendMessage('start_game', {
        room_id: currentRoom.value.id,
      });
    }
  };

  // 发送游戏消息
  const sendGameMessage = (type, data = {}) => {
    if (currentRoom.value) {
      sendMessage(type, {
        room_id: currentRoom.value.id,
        ...data,
      });
    }
  };

  // --- 工具方法 ---
  const formatTime = timestamp => new Date(timestamp).toLocaleString();

  const copyRoomCode = async () => {
    if (!currentRoom.value?.room_code) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(currentRoom.value.room_code);
      return true;
    } catch (err) {
      console.error('复制失败:', err);
      return false;
    }
  };

  const getStatusText = status => {
    const statusMap = {
      waiting: '等待中',
      playing: '游戏中',
      finished: '已结束',
      paused: '已暂停',
    };
    return statusMap[status] || status;
  };

  // --- 计算属性 ---
  const isHost = computed(
    () => currentRoom.value?.created_by === currentPlayer.value?.session_id
  );

  const readyCount = computed(
    () => players.value.filter(p => p.is_ready).length
  );

  const allPlayersReady = computed(
    () => players.value.length > 0 && readyCount.value === players.value.length
  );

  const canStartGame = computed(() => {
    const minPlayers = currentRoom.value?.game_settings?.minPlayers || 1;
    return (
      isHost.value &&
      allPlayersReady.value &&
      players.value.length >= minPlayers
    );
  });

  const roomInfo = computed(() => {
    if (!currentRoom.value) return null;
    return {
      code: currentRoom.value.room_code,
      mode: currentRoom.value.mode,
      status: currentRoom.value.status,
      playerCount: `${currentRoom.value.current_players}/${currentRoom.value.max_players}`,
      gameType: currentRoom.value.game_type || gameType,
      settings: currentRoom.value.game_settings || {},
    };
  });

  // --- 生命周期 ---
  onMounted(() => {
    if (autoConnect) {
      connectToServer();
    }
  });

  onUnmounted(() => {
    disconnectFromServer();
  });

  // --- 扩展API ---
  const registerHandler = (event, handler) => {
    messageRegistry.register(event, handler);
    if (isConnected.value) {
      bindListener(event);
    }
  };

  const unregisterHandler = (event, handler) => {
    messageRegistry.unregister(event, handler);
    if (!coreEvents.has(event) && !messageRegistry.hasEvent(event)) {
      unbindListener(event);
    }
  };

  const reset = () => {
    resetState();
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
    apiPrefix,
    normalizedApiPrefix,
  };
}
