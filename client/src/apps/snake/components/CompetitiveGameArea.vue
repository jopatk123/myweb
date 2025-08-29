<template>
  <div class="competitive-game-area">
    <!-- 玩家游戏区域 -->
    <div class="players-games">
      <PlayerGameCard
        v-for="gamePlayer in gamePlayers"
        :key="gamePlayer.session_id"
        :player="gamePlayer"
        :currentPlayer="player"
        :gameState="gameState"
      />
    </div>

    <!-- 控制提示 -->
    <ControlHints />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PlayerGameCard from './PlayerGameCard.vue'
import ControlHints from './ControlHints.vue'

const props = defineProps({
  room: { type: Object, required: true },
  player: { type: Object, required: true },
  players: { type: Array, required: true },
  gameState: { type: Object, required: true }
})

const emit = defineEmits(['move'])

const gamePlayers = computed(() => 
  props.players.filter(p => props.gameState?.snakes?.[p.session_id])
)

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
  if (direction) {
    emit('move', direction)
  }
}

// 添加键盘事件监听
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.competitive-game-area {
  display: grid;
  gap: 20px;
}

.players-games {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .players-games {
    grid-template-columns: 1fr;
  }
}
</style>
