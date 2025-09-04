<template>
  <div class="snake-lobby">
    <!-- 头部导航 -->
    <LobbyHeader 
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
// 如果 localStorage 中没有保存的名字，则生成一个默认昵称并保存，用户可以编辑也可以直接使用默认值开始游戏
const _storedSnakeName = localStorage.getItem('snakePlayerName')
let initialSnakeName
if (_storedSnakeName && _storedSnakeName.trim()) {
  initialSnakeName = _storedSnakeName
} else {
  // 生成形如：玩家4839 的默认昵称，并持久化到 localStorage，保证在刷新/关闭后保持一致
  initialSnakeName = `玩家${Math.floor(1000 + Math.random() * 9000)}`
  try {
    localStorage.setItem('snakePlayerName', initialSnakeName)
  } catch (e) {
    // 在无 localStorage 或受限环境下忽略错误，仅在内存中使用默认名
    console.warn('无法写入 localStorage:', e && e.message)
  }
}
const playerName = ref(initialSnakeName)
const selectedMode = ref('competitive')
const roomCodeInput = ref('')
const activeRooms = ref([])

// 监听玩家名字变化，保存到本地存储
watch(playerName, (newName) => {
  localStorage.setItem('snakePlayerName', newName)
})

// 业务逻辑函数
  const refreshRooms = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const rooms = await snakeMultiplayerApi.getActiveRooms()
    activeRooms.value = rooms
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
  console.log('观战功能尚未开放。');
  error.value = '观战功能尚未开放。';
}

 

// 组件挂载时初始化
onMounted(async () => {
  await init()
  await refreshRooms()
  
  // 监听 WebSocket 事件来刷新房间列表
  if (typeof onMessage === 'function') {
    onMessage('snake_room_list_updated', () => {
      if (!loading.value) refreshRooms()
    });
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
