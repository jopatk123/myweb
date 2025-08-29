/**
 * 贪吃蛇多人游戏主组合式函数（重构版）
 * 拆分：事件系统 / 消息处理器 / 主逻辑
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useWebSocket } from './useWebSocket.js';
import { createSnakeEvents } from './multiplayer/snakeEvents.js';
import { createSnakeHandlers } from './multiplayer/snakeHandlers.js';

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

  const resetRoomState = () => {
    isInRoom.value = false;
    currentRoom.value = null;
    currentPlayer.value = null;
    players.value = [];
    gameState.value = null;
    gameStatus.value = 'lobby';
    votes.value = {}; myVote.value = null; voteTimeout.value = 0; clearVoteTimer();
  };

  const startVoteCountdown = (seconds) => {
    clearVoteTimer();
    voteTimeout.value = seconds;
    voteTimer.value = setInterval(() => {
      if (voteTimeout.value > 0) {
        voteTimeout.value -= 1;
      }
      if (voteTimeout.value <= 0) {
        clearVoteTimer();
      }
    }, 1000);
  };

  // API 封装
  const createRoom = (playerName, mode, gameSettings = {}) => {
    loading.value = true; error.value = null;
    send({ type: 'snake_create_room', data: { playerName, mode, gameSettings } });
  };
  const joinRoom = (playerName, roomCode) => {
    loading.value = true; error.value = null;
    send({ type: 'snake_join_room', data: { playerName, roomCode: roomCode.toUpperCase() } });
  };
  const toggleReady = () => currentRoom.value && send({ type: 'snake_toggle_ready', data: { roomCode: currentRoom.value.room_code } });
  const vote = (direction) => currentRoom.value?.mode === 'shared' && (myVote.value = direction, send({ type: 'snake_vote', data: { roomCode: currentRoom.value.room_code, direction } }));
  const move = (direction) => currentRoom.value?.mode === 'competitive' && send({ type: 'snake_move', data: { roomCode: currentRoom.value.room_code, direction } });
  const leaveRoom = () => {
    if (!currentRoom.value) return;
    send({ type: 'snake_leave_room', data: { roomCode: currentRoom.value.room_code } });
    resetRoomState();
  };
  const getRoomInfo = (roomCode) => send({ type: 'snake_get_room_info', data: { roomCode: roomCode.toUpperCase() } });
  const startGame = () => currentRoom.value && send({ type: 'snake_start_game', data: { roomCode: currentRoom.value.room_code } });
  const handleVote = vote; // 语义别名
  const handleMove = move; // 语义别名
  const kickPlayer = (playerId) => currentRoom.value?.created_by === currentPlayer.value?.session_id && send({ type: 'snake_kick_player', data: { roomCode: currentRoom.value.room_code, playerId } });

  // 供 handlers 注入的上下文
  const handlerCtx = {
    state: { isInRoom, loading },
    events,
    api: { getRoomInfo },
    refs: { currentRoom, currentPlayer, players, gameState, gameStatus, error, votes, myVote, voteTimeout, voteTimer },
    utils: { resetRoomState, clearVoteTimer },
  };
  const messageHandlers = createSnakeHandlers(handlerCtx);

  // 初始化 & 清理
  const registerHandlers = () => { Object.entries(messageHandlers).forEach(([type, h]) => onMessage(type, h)); };
  const unregisterHandlers = () => { Object.keys(messageHandlers).forEach(type => offMessage(type)); };

  const init = async () => {
    try {
      loading.value = true; error.value = null;
      if (!isConnected.value) await connect();
      registerHandlers();
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
  };
}
