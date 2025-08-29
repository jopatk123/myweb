<template>
  <div class="snake-lobby-adapter">
    <!-- 复用通用 GameLobby 组件 -->
  <GameLobby ref="gameLobbyRef"
      :player-name.sync="playerName"
      :mode.sync="selectedMode"
      :loading="loadingRooms || roomState.loading"
      :error="roomState.error"
      @refresh="refreshRooms"
      @create-room="handleCreateRoom"
      @quick-join="handleQuickJoin"
      @join-room="handleJoinRoom"
      @show-stats="showStats=true; loadStats()"
      @show-leaderboard="showLeaderboard=true; loadLeaderboard()"
      @clear-error="roomState.error=null"
    />

    <StatsModal :visible="showStats" :stats="playerStats" @close="showStats=false" />
    <LeaderboardModal :visible="showLeaderboard" :list="leaderboard" :mode="leaderboardMode" @close="showLeaderboard=false" @change-mode="changeLeaderboardMode" />
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { GameLobby, StatsModal, LeaderboardModal, useMultiplayerRoom } from '@/components/multiplayer';
import { snakeMultiplayerApi } from '@/api/snake-multiplayer.js';

// 本地状态
const playerName = ref(localStorage.getItem('snakePlayerName') || '');
const selectedMode = ref('shared');
const rooms = ref([]);
const gameLobbyRef = ref(null);
const loadingRooms = ref(false);
const showStats = ref(false);
const showLeaderboard = ref(false);
const playerStats = ref(null);
const leaderboard = ref([]);
const leaderboardMode = ref('all');

// 通用房间管理状态
const roomState = useMultiplayerRoom('snake');

// 刷新房间列表
const refreshRooms = async () => {
  try {
    loadingRooms.value = true;
  rooms.value = await snakeMultiplayerApi.getActiveRooms();
  // 同步到 GameLobby 内部
  gameLobbyRef.value?.setActiveRooms(rooms.value);
  } finally {
    loadingRooms.value = false;
  }
};

const ensurePlayerName = () => {
  const name = playerName.value.trim();
  if (!name) throw new Error('请输入昵称');
  localStorage.setItem('snakePlayerName', name);
  return name;
};

// 创建房间
const handleCreateRoom = async (config = {}) => {
  const name = ensurePlayerName();
  await roomState.createRoom(name, { mode: selectedMode.value, ...config });
};

// 快速加入：寻找匹配房间，否则创建
const handleQuickJoin = async () => {
  const name = ensurePlayerName();
  const candidate = rooms.value.find(r => r.status === 'waiting' && r.mode === selectedMode.value && r.current_players < r.max_players);
  if (candidate) {
    await roomState.joinRoom(name, candidate.room_code);
  } else {
    await handleCreateRoom();
  }
};

// 加入指定房间
const handleJoinRoom = async (roomCode) => {
  const name = ensurePlayerName();
  await roomState.joinRoom(name, roomCode);
};

// 统计 & 排行榜
const loadStats = async () => {
  try { playerStats.value = await snakeMultiplayerApi.getPlayerStats(); } catch(e){ console.error(e); }
};
const loadLeaderboard = async (mode=null) => {
  try { leaderboard.value = await snakeMultiplayerApi.getLeaderboard(mode==='all'?null:mode); } catch(e){ console.error(e); }
};
const changeLeaderboardMode = (m) => { leaderboardMode.value = m; loadLeaderboard(m); };

onMounted(() => {
  refreshRooms();
  const interval = setInterval(refreshRooms, 10000);
  // 清理
  window.addEventListener('beforeunload', () => clearInterval(interval));
});
</script>
<style scoped>
.snake-lobby-adapter { padding: 16px; }
</style>
