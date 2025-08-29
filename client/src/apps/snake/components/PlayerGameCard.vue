<template>
  <div class="player-game" :class="{ 'is-me': player.session_id === currentPlayer.session_id }">
    <!-- 玩家信息 -->
    <div class="player-game-header">
      <div 
        class="player-indicator"
        :style="{ backgroundColor: player.player_color }"
      >
        {{ player.player_name.charAt(0).toUpperCase() }}
      </div>
      <div class="player-game-info">
        <div class="player-game-name">{{ player.player_name }}</div>
        <div class="player-game-stats">
          分数: {{ playerSnake?.score || 0 }} | 
          长度: {{ playerSnake?.length || 3 }}
        </div>
      </div>
      <div class="player-game-status">
        <span 
          v-if="playerSnake?.gameOver"
          class="game-over-indicator"
        >
          💀 游戏结束
        </span>
        <span v-else class="alive-indicator">🟢 存活</span>
      </div>
    </div>

    <!-- 游戏画布 -->
    <div class="player-canvas-container">
      <SnakeCanvas
        :board-size="300"
        :cell="15"
        :snake="playerSnake?.body || []"
        :food="gameState?.food?.[player.session_id]"
        :grid-size="20"
        :game-over="playerSnake?.gameOver || false"
        class="competitive-canvas"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SnakeCanvas from '../SnakeCanvas.vue'

const props = defineProps({
  player: { type: Object, required: true },
  currentPlayer: { type: Object, required: true },
  gameState: { type: Object, required: true }
})

const playerSnake = computed(() => {
  return props.gameState?.snakes?.[props.player.session_id]
})
</script>

<style scoped>
.player-game {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.player-game.is-me {
  border: 2px solid #667eea;
}

.player-game-header {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  gap: 15px;
}

.player-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.player-game-info {
  flex: 1;
}

.player-game-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.player-game-stats {
  color: #666;
  font-size: 14px;
}

.player-game-status {
  text-align: right;
}

.game-over-indicator {
  color: #ff4757;
  font-weight: 500;
  font-size: 14px;
}

.alive-indicator {
  color: #2ed573;
  font-weight: 500;
  font-size: 14px;
}

.player-canvas-container {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.competitive-canvas {
  border: 1px solid #e1e8ed;
  border-radius: 4px;
}
</style>
