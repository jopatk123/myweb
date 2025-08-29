<template>
  <div class="snake-room">
    <!-- 房间头部 -->
    <RoomHeader
      :room="currentRoom"
      :gameStatus="gameStatus"
      @copy-room-code="copyRoomCode"
      @leave-room="leaveRoom"
    />

    <!-- 错误提示 -->
    <ErrorAlert 
      v-if="error" 
      :error="error"
      @close="error = null"
    />

    <!-- 游戏进行中 -->
    <GamePanel
      v-if="gameStatus === 'playing'"
      :room="currentRoom"
      :gameState="gameState"
      :voteTimeout="voteTimeout"
      :myVote="myVote"
      :votes="votes"
      @vote="handleVote"
      @move="handleMove"
    />

    <!-- 等待室 -->
    <WaitingRoom
      v-else
      :room="currentRoom"
      :players="players"
      :currentPlayer="currentPlayer"
      :gameState="gameState"
      :isReady="isReady"
      :readyCount="readyCount"
      :canStartGame="canStartGame"
      @toggle-ready="toggleReady"
      @start-game="startGame"
      @kick-player="kickPlayer"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSnakeMultiplayer } from '../../composables/useSnakeMultiplayer.js'

// 组件导入
import RoomHeader from './room/RoomHeader.vue'
import ErrorAlert from './lobby/ErrorAlert.vue'
import GamePanel from './room/GamePanel.vue'
import WaitingRoom from './room/WaitingRoom.vue'

const emit = defineEmits(['leaveRoom', 'gameUpdate'])

// 使用多人游戏组合式函数
const {
  currentRoom,
  currentPlayer,
  players,
  gameState,
  gameStatus,
  error,
  isReady,
  myVote,
  voteTimeout,
  votes,
  toggleReady,
  startGame,
  handleVote,
  handleMove,
  kickPlayer,
  leaveRoom: leave,
  onGameUpdate,
  onPlayerJoin,
  onPlayerLeave,
  onPlayerReady,
  onVoteUpdate,
  init
} = useSnakeMultiplayer()

// 计算属性
const readyCount = computed(() => 
  players.value.filter(p => p.is_ready).length
)

const canStartGame = computed(() => 
  players.value.length >= 2 && 
  readyCount.value === players.value.length &&
  currentRoom.value?.created_by === currentPlayer.value?.session_id
)

// 方法
const copyRoomCode = () => {
  if (!currentRoom.value?.room_code) return
  
  navigator.clipboard.writeText(currentRoom.value.room_code).then(() => {
    // TODO: 显示复制成功提示
    console.log('房间码已复制')
  }).catch(err => {
    console.error('复制失败:', err)
  })
}

const leaveRoom = () => {
  leave()
  emit('leaveRoom')
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 生命周期
onMounted(() => {
  init()
  
  // 监听游戏事件
  onGameUpdate((data) => {
    emit('gameUpdate', data)
  })
  
  onPlayerJoin((player) => {
    console.log('玩家加入:', player.player_name)
  })
  
  onPlayerLeave((player) => {
    console.log('玩家离开:', player.player_name)
  })
  
  onPlayerReady((data) => {
    console.log('玩家准备状态:', data)
  })
  
  onVoteUpdate((data) => {
    console.log('投票更新:', data)
  })
})

onUnmounted(() => {
  // 清理事件监听器在 composable 中处理
})
</script>

<style scoped>
.snake-room {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
