<template>
  <div class="shared-game-area">
    <!-- 游戏信息栏 -->
    <GameInfoBar :gameState="gameState" :voteTimeout="voteTimeout" />
    
    <!-- 投票区域 -->
    <VotingArea
      :votes="votes"
      :myVote="myVote"
      :voteTimeout="voteTimeout"
      :players="players"
      @vote="handleVote"
    />

    <!-- 游戏画布 -->
    <div class="game-canvas-container">
      <SnakeCanvas
        ref="sharedCanvas"
        :board-size="BOARD_SIZE"
        :cell="CELL"
        :snake="gameState?.sharedSnake?.body || []"
        :food="gameState?.food"
        :grid-size="GRID_SIZE"
        class="shared-canvas"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SnakeCanvas from '../SnakeCanvas.vue'
import GameInfoBar from './GameInfoBar.vue'
import VotingArea from './VotingArea.vue'

defineProps({
  room: { type: Object, required: true },
  players: { type: Array, required: true },
  gameState: { type: Object, required: true }
})

const emit = defineEmits(['vote'])

const sharedCanvas = ref(null)
const votes = ref({})
const myVote = ref(null)
const voteTimeout = ref(0)
const voteTimer = ref(null)

const handleVote = (direction) => {
  if (voteTimeout.value <= 0) return
  
  myVote.value = direction
  emit('vote', direction)
}

// 共享模式画布配置：固定单元像素 20px，画布像素随格子数变化
const CELL = 20
const GRID_SIZE = 25
const BOARD_SIZE = CELL * GRID_SIZE

// 处理键盘输入
const handleKeyPress = (event) => {
  const keyMap = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'KeyW': 'up',
    'KeyS': 'down',
    'KeyA': 'left',
    'KeyD': 'right'
  }
  
  const direction = keyMap[event.code]
  if (direction && voteTimeout.value > 0) {
    handleVote(direction)
  }
}

// 启动投票倒计时
const startVoteCountdown = () => {
  voteTimeout.value = 3
  voteTimer.value = setInterval(() => {
    voteTimeout.value--
    if (voteTimeout.value <= 0) {
      clearInterval(voteTimer.value)
      voteTimer.value = null
      myVote.value = null
    }
  }, 1000)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress)
  startVoteCountdown()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
  
  if (voteTimer.value) {
    clearInterval(voteTimer.value)
  }
})
</script>

<style scoped>
.shared-game-area {
  display: grid;
  gap: 20px;
  grid-template-rows: auto auto 1fr;
}

.game-canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.shared-canvas {
  border: 2px solid #e1e8ed;
  border-radius: 8px;
}

@media (max-width: 1200px) {
  .shared-game-area {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .game-info-bar {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .shared-game-area {
    grid-template-columns: 1fr;
  }
}
</style>
