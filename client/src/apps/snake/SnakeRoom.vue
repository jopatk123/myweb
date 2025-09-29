<template>
  <div class="snake-room">
    <div v-if="copied" class="copy-toast">房间码已复制</div>
    <!-- 房间头部 -->
    <RoomHeader
      :room="currentRoom"
      :gameStatus="gameStatus"
  :currentPlayer="currentPlayer"
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
      v-if="gameStatus === 'playing' || gameStatus === 'finished'"
      :room="currentRoom"
      :gameState="gameState"
  :players="players"
      :voteTimeout="voteTimeout"
      :myVote="myVote"
      :votes="votes"
  :current-player-id="currentPlayer?.session_id"
      @vote="handleVote"
      @move="handleMove"
  @restart="startGame"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

const canStartGame = computed(() => {
  const isHost = currentRoom.value?.created_by === currentPlayer.value?.session_id;
  const hasPlayers = players.value.length >= 1;
  const isSharedMode = currentRoom.value?.mode === 'shared';
  
  if (!isHost || !hasPlayers) return false;
  
  // 共享模式允许单人开始，其他模式需要所有人准备
  if (isSharedMode) {
    return true; // 共享模式房主可以随时开始
  } else {
    return readyCount.value === players.value.length; // 其他模式需要所有人准备
  }
})

// 方法
const copied = ref(false)
const copyRoomCode = () => {
  const code = currentRoom.value?.room_code || currentRoom.value?.roomCode
  if (!code) return
  navigator.clipboard.writeText(code).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  }).catch(err => {
    console.error('复制失败:', err)
  })
}

const leaveRoom = () => {
  leave()
  emit('leaveRoom')
}

// 生命周期
onMounted(() => {
  init()
  
  // 监听游戏事件
  onGameUpdate((data) => {
    emit('gameUpdate', data)
  })
  
  onPlayerJoin(() => {
  })
  
  onPlayerLeave(() => {
  })
  
  onPlayerReady(() => {
  })
  
  onVoteUpdate(() => {
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
