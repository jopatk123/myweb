<template>
  <div class="snake-room">
    <div v-if="copied" class="copy-toast">房间码已复制</div>
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
const copied = ref(false)
const copyRoomCode = () => {
  const code = currentRoom.value?.room_code || currentRoom.value?.roomCode
  if (!code) return
  navigator.clipboard.writeText(code).then(() => {
    copied.value = true
    console.log('房间码已复制', code)
    setTimeout(() => { copied.value = false }, 1800)
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
<style scoped>
/* 复制提示，可后续替换成全局通知组件 */
.copy-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,.75);
  color: #fff;
  padding: 6px 14px;
  border-radius: 18px;
  font-size: 13px;
  animation: fade 1.8s ease forwards;
  pointer-events: none;
  z-index: 9999;
}
@keyframes fade { 0% { opacity:0; transform:translate(-50%,-4px);} 10%,90% { opacity:1; transform:translate(-50%,0);} 100% { opacity:0; transform:translate(-50%,-4px);} }
</style>
