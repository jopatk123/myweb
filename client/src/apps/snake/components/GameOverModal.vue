<template>
  <div class="game-over-overlay">
    <div class="game-over-modal">
      <h2>🎮 游戏结束</h2>
      
      <!-- 共享模式结果 -->
      <SharedModeResult
        v-if="room.mode === 'shared'"
        :gameState="gameState"
        :players="players"
      />

      <!-- 竞技模式结果 -->
      <CompetitiveModeResult
        v-else
        :gameState="gameState"
        :players="players"
      />

      <div class="game-over-actions">
        <button class="btn-primary" @click="$emit('game-over', gameState)">
          返回房间
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import SharedModeResult from './SharedModeResult.vue'
import CompetitiveModeResult from './CompetitiveModeResult.vue'

defineProps({
  room: { type: Object, required: true },
  gameState: { type: Object, required: true },
  players: { type: Array, required: true }
})

defineEmits(['game-over'])
</script>

<style scoped>
.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.game-over-modal {
  background: white;
  border-radius: 15px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.game-over-modal h2 {
  margin: 0 0 30px 0;
  color: #2c3e50;
  font-size: 28px;
}

.game-over-actions {
  display: flex;
  justify-content: center;
}

.btn-primary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #667eea;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .game-over-modal {
    padding: 20px;
  }
}
</style>
