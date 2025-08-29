<template>
  <div class="snake-lobby">
    <!-- 头部导航 -->
    <LobbyHeader 
      @show-stats="showStats = true"
      @show-leaderboard="showLeaderboard = true"
      @refresh-rooms="refreshRooms"
      :loading="loading"
    />

    <!-- 错误提示 -->
    <ErrorAlert 
      v-if="error" 
      :error="error"
      @close="error = null"
    />

    <!-- 连接状态 -->
    <ConnectionStatus v-if="!isConnected" />

    <div v-else class="lobby-content">
      <!-- 快速开始区域 -->
      <QuickStartSection
        v-model:playerName="playerName"
        v-model:selectedMode="selectedMode"
        :loading="loading"
        @create-room="createNewRoom"
        @quick-join="quickJoin"
      />

      <!-- 加入指定房间 -->
      <JoinRoomSection
        v-model:roomCode="roomCodeInput"
        v-model:playerName="playerName"
        :loading="loading"
        @join-room="joinSpecificRoom"
      />

      <!-- 活跃房间列表 -->
      <ActiveRoomsSection
        :rooms="activeRooms"
        :loading="loading"
        @refresh="refreshRooms"
        @join-room="joinRoomById"
        @spectate="spectateRoom"
      />
    </div>

    <!-- 统计信息弹窗 -->
    <StatsModal
      v-if="showStats"
      :stats="playerStats"
      @close="showStats = false"
    />

    <!-- 排行榜弹窗 -->
    <LeaderboardModal
      v-if="showLeaderboard"
      :leaderboard="leaderboard"
      :mode="leaderboardMode"
      @close="showLeaderboard = false"
      @switch-mode="switchLeaderboardMode"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSnakeMultiplayer } from '../../composables/useSnakeMultiplayer.js'
import { snakeMultiplayerApi } from '../../api/snake-multiplayer.js'

// 组件导入
import LobbyHeader from './lobby/LobbyHeader.vue'
import ErrorAlert from './lobby/ErrorAlert.vue'
import ConnectionStatus from './lobby/ConnectionStatus.vue'
import QuickStartSection from './lobby/QuickStartSection.vue'
import JoinRoomSection from './lobby/JoinRoomSection.vue'
import ActiveRoomsSection from './lobby/ActiveRoomsSection.vue'
import StatsModal from './lobby/StatsModal.vue'
import LeaderboardModal from './lobby/LeaderboardModal.vue'

const emit = defineEmits(['joinRoom', 'createRoom'])

// 使用多人游戏组合式函数
const { 
  isConnected, 
  error, 
  loading,
  createRoom,
  joinRoom,
  init,
  onMessage,
  offMessage
} = useSnakeMultiplayer()

// 本地状态
const playerName = ref(localStorage.getItem('snakePlayerName') || '')
const selectedMode = ref('shared')
const roomCodeInput = ref('')
const activeRooms = ref([])
const showStats = ref(false)
const showLeaderboard = ref(false)
const playerStats = ref(null)
const leaderboard = ref([])
const leaderboardMode = ref('all')

// 监听玩家名字变化，保存到本地存储
watch(playerName, (newName) => {
  localStorage.setItem('snakePlayerName', newName)
})

// 业务逻辑函数
const refreshRooms = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    activeRooms.value = await snakeMultiplayerApi.getActiveRooms()
  } catch (err) {
    console.error('刷新房间失败:', err)
    error.value = '无法加载房间列表，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

const createNewRoom = async () => {
  if (!playerName.value.trim()) {
    error.value = '请输入您的玩家名称！';
    return;
  }
  
  try {
    await createRoom(playerName.value.trim(), selectedMode.value)
    emit('createRoom')
  } catch (err) {
    console.error('创建房间失败:', err)
    error.value = err.message || '创建房间失败';
  }
}

const quickJoin = async () => {
  if (!playerName.value.trim()) {
    error.value = '请输入您的玩家名称！';
    return;
  }
  
  await refreshRooms(); // 先刷新一次列表

  const suitableRoom = activeRooms.value.find(room => 
    room.status === 'waiting' && 
    room.mode === selectedMode.value &&
    room.current_players < room.max_players
  )
  
  if (suitableRoom) {
    await joinRoomById(suitableRoom.room_code)
  } else {
    await createNewRoom()
  }
}

const joinSpecificRoom = async () => {
  if (!playerName.value.trim() || !roomCodeInput.value.trim()) {
    error.value = '请输入玩家名称和房间码！';
    return;
  }
  
  try {
    await joinRoom(playerName.value.trim(), roomCodeInput.value.trim())
    emit('joinRoom')
  } catch (err) {
    console.error('加入房间失败:', err)
    error.value = err.message || '加入房间失败';
  }
}

const joinRoomById = async (roomCode) => {
  if (!playerName.value.trim()) {
    error.value = '请输入您的玩家名称！';
    return;
  }
  
  try {
    await joinRoom(playerName.value.trim(), roomCode)
    emit('joinRoom')
  } catch (err) {
    console.error('加入房间失败:', err)
    error.value = err.message || '加入房间失败';
  }
}

const spectateRoom = (roomCode) => {
  console.log('观战房间:', roomCode)
  // 可以在这里实现观战逻辑
  error.value = '观战功能尚未开放。';
}

const loadPlayerStats = async () => {
  try {
    playerStats.value = await snakeMultiplayerApi.getPlayerStats()
  } catch (err) {
    console.error('加载统计信息失败:', err)
    playerStats.value = null
  }
}

const loadLeaderboard = async (mode = null) => {
  try {
    leaderboard.value = await snakeMultiplayerApi.getLeaderboard(mode)
  } catch (err) {
    console.error('加载排行榜失败:', err)
    leaderboard.value = []
  }
}

const switchLeaderboardMode = (mode) => {
  leaderboardMode.value = mode
  const apiMode = mode === 'all' ? null : mode
  loadLeaderboard(apiMode)
}

// 监听弹窗显示，加载数据
watch(showStats, (show) => {
  if (show) loadPlayerStats()
})

watch(showLeaderboard, (show) => {
  if (show) loadLeaderboard()
})

// 组件挂载时初始化
onMounted(async () => {
  await init()
  await refreshRooms()
  
  // 监听 WebSocket 事件来刷新房间列表
  if (typeof onMessage === 'function') {
    onMessage('snake_room_list_updated', refreshRooms);
  } else {
    console.warn('useSnakeMultiplayer: onMessage 不可用，房间列表将使用轮询刷新');
  }
})

onBeforeUnmount(() => {
  if (typeof offMessage === 'function') {
    offMessage('snake_room_list_updated');
  }
});
</script>

<style scoped>
.snake-lobby {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.lobby-content {
  display: grid;
  gap: 30px;
}
</style>
