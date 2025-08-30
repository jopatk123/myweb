/**
 * 贪吃蛇多人游戏主组合式函数（重构版）
 * 拆分：事件系统 / 消息处理器 / 主逻辑
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useWebSocket } from './useWebSocket.js';
import { createSnakeEvents } from './multiplayer/snakeEvents.js';
import { createSnakeHandlers } from './multiplayer/snakeHandlers.js';
import { SnakeApiClient } from './multiplayer/snakeApiClient.js';
import { SnakeStateManager } from './multiplayer/snakeStateManager.js';

export function useSnakeMultiplayer() {
  // WebSocket
  const { ws, isConnected, connect, disconnect, send, onMessage, offMessage } = useWebSocket();

  // 基础状态
  const isInRoom = ref(false);
  const currentRoom = ref(null);
  const currentPlayer = ref(null);
  const players = ref([]);
  const gameState = ref(null);
  const gameStatus = ref('lobby'); // lobby|waiting|starting|playing|finished
  const error = ref(null);
  const loading = ref(false);

  // 投票
  const votes = ref({});
  const voteTimeout = ref(0); // 倒计时秒
  const voteTimer = ref(null);
  const myVote = ref(null);

  // 统计 / 排行（占位，后续可由独立 API 填充）
  const playerStats = ref(null);
  const leaderboard = ref([]);

  // 计算属性
  const canStart = computed(() => {
    // 共享模式：只要房间存在且至少1人（自己）即可开始
    if (currentRoom.value?.mode === 'shared') {
      return players.value.length >= 1;
    }
    // 竞技模式：所有在线玩家都准备且至少2人
    const readyPlayers = players.value.filter(p => p.is_ready);
    return readyPlayers.length >= 2 && readyPlayers.length === players.value.length;
  });
  const isReady = computed(() => currentPlayer.value?.is_ready || false);
  const isGameHost = computed(() => currentRoom.value?.created_by === currentPlayer.value?.session_id);

  // 事件系统
  const events = createSnakeEvents();

  // 工具函数
  const clearVoteTimer = () => {
    if (voteTimer.value) { clearInterval(voteTimer.value); voteTimer.value = null; }
  };

  // 初始化管理器
  const refs = {
    isInRoom, currentRoom, currentPlayer, players, gameState, gameStatus,
    error, loading, votes, voteTimeout, voteTimer, myVote
  };
  
  const utils = { clearVoteTimer };
  const stateManager = new SnakeStateManager(refs, utils);
  const apiClient = new SnakeApiClient({ send });

  const resetRoomState = () => stateManager.resetRoomState();
  const startVoteCountdown = (seconds) => stateManager.startVoteCountdown(seconds);

  // API 封装
  const createRoom = (playerName, mode, gameSettings = {}) => {
    stateManager.setLoading(true);
    stateManager.clearError();

    apiClient.createRoom(playerName, mode, gameSettings);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('创建房间超时'));
        stateManager.setLoading(false);
      }, 8000);

      const stop = watch(currentRoom, (val) => {
        if (val && (val.room_code || val.roomCode)) {
          clearTimeout(timer);
          stop();
          stateManager.setLoading(false);
          resolve(val);
        }
      });
    });
  };

  const joinRoom = (playerName, roomCode) => {
    stateManager.setLoading(true);
    stateManager.clearError();

    apiClient.joinRoom(playerName, roomCode);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('加入房间超时'));
        stateManager.setLoading(false);
      }, 8000);

      const stop = watch(currentRoom, (val) => {
        if (val && (val.room_code || val.roomCode) && 
            (val.room_code || val.roomCode).toUpperCase() === roomCode.toUpperCase()) {
          clearTimeout(timer);
          stop();
          stateManager.setLoading(false);
          resolve(val);
        }
      });
    });
  };

  const toggleReady = () => {
    const code = currentRoom.value?.room_code || currentRoom.value?.roomCode;
    if (code) {
      apiClient.toggleReady(code);
    }
  };

  const vote = (direction) => {
    if (currentRoom.value?.mode !== 'shared') return;
    const code = currentRoom.value.room_code || currentRoom.value.roomCode;
    if (code) {
      stateManager.setMyVote(direction);
      apiClient.vote(code, direction);
    }
  };

  const move = (direction) => {
    if (currentRoom.value?.mode !== 'competitive') return;
    const code = currentRoom.value.room_code || currentRoom.value.roomCode;
    if (code) {
      apiClient.move(code, direction);
    }
  };

  const leaveRoom = () => {
    const code = currentRoom.value?.room_code || currentRoom.value?.roomCode;
    if (code) {
      apiClient.leaveRoom(code);
    }
    resetRoomState();
    localStorage.removeItem('snakeCurrentRoomCode');
  };

  const getRoomInfo = (roomCode) => apiClient.getRoomInfo(roomCode);
  
  const startGame = () => {
    const code = currentRoom.value?.room_code || currentRoom.value?.roomCode;
    if (code) {
      apiClient.startGame(code);
    }
  };

  const handleVote = vote; // 语义别名
  const handleMove = move; // 语义别名
  
  const kickPlayer = (playerId) => {
    if (currentRoom.value?.created_by !== currentPlayer.value?.session_id) return;
    const code = currentRoom.value?.room_code || currentRoom.value?.roomCode;
    if (code) {
      apiClient.kickPlayer(code, playerId);
    }
  };

  // 供 handlers 注入的上下文
  const handlerCtx = {
    state: { isInRoom, loading },
    events,
    api: { getRoomInfo },
    refs: { currentRoom, currentPlayer, players, gameState, gameStatus, error, votes, myVote, voteTimeout, voteTimer },
    utils: { resetRoomState, clearVoteTimer },
  };
  const messageHandlers = createSnakeHandlers(handlerCtx);

  // 新增：处理房间列表更新
  const handleRoomListUpdated = () => {
    // 这是一个从Lobby发出的事件，所以这里不需要做什么，但可以留作调试
  };

  // 初始化 & 清理
  const registerHandlers = () => {
    Object.entries(messageHandlers).forEach(([type, h]) => onMessage(type, h));
    onMessage('snake_room_list_updated', handleRoomListUpdated); // 监听列表更新
  };
  const unregisterHandlers = () => {
    Object.keys(messageHandlers).forEach(type => offMessage(type));
    offMessage('snake_room_list_updated');
  };

  const init = async () => {
    try {
      loading.value = true; error.value = null;
      if (!isConnected.value) await connect();
      registerHandlers();
      // 恢复房间（如果页面刷新过且房间仍然存在）
      const cachedCode = localStorage.getItem('snakeCurrentRoomCode');
      if (cachedCode) {
        // 请求房间信息，如果不存在会返回 null
        getRoomInfo(cachedCode);
      }
    } catch (e) {
      error.value = e.message || '初始化失败';
    } finally {
      loading.value = false;
    }
  };

  const cleanup = () => {
    unregisterHandlers();
    clearVoteTimer();
    // 不主动断开 WebSocket（交由全局复用），如需彻底关闭可调用 disconnect()
  };

  onMounted(() => { init(); });
  onUnmounted(() => { cleanup(); });

  return {
    // 状态
    isConnected, isInRoom, currentRoom, currentPlayer, players, gameState, gameStatus, error, loading,
    votes, voteTimeout, myVote, playerStats, leaderboard,
    // 计算属性
    canStart, isReady, isGameHost,
    // 行为
  init, createRoom, joinRoom, toggleReady, vote, move, leaveRoom, getRoomInfo, resetRoomState, startVoteCountdown, cleanup, startGame, handleVote, handleMove, kickPlayer,
    // 事件订阅
    onGameUpdate: events.onGameUpdate,
    onPlayerJoin: events.onPlayerJoin,
    onPlayerLeave: events.onPlayerLeave,
    onPlayerReady: events.onPlayerReady,
    onVoteUpdate: events.onVoteUpdate,
    onAutoPopup: events.onAutoPopup,
  // 直接暴露底层 WebSocket 事件注册方法，供界面注册自定义事件（例如房间列表更新）
  onMessage,
  offMessage,
  };
}
