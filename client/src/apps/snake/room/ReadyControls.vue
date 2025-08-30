<template>
  <div class="ready-controls">
    <button 
      class="ready-btn"
      :class="{ 'ready': isReady, 'not-ready': !isReady }"
      @click="$emit('toggle-ready')"
    >
      {{ isReady ? '✅ 已准备' : '⏳ 点击准备' }}
    </button>

    <!-- 房主开始游戏按钮 -->
    <button 
      v-if="isHost"
      class="start-game-btn"
      :disabled="!canStartGame"
      @click="$emit('start-game')"
    >
      🚀 开始游戏
    </button>
    
    <div v-if="isHost && !canStartGame" class="start-game-hint">
      {{ (players?.length || 0) < 1 ? '至少需要1名玩家才能开始游戏' : '等待所有玩家准备就绪' }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  isReady: { type: Boolean, default: false },
  canStartGame: { type: Boolean, default: false },
  isHost: { type: Boolean, default: false },
  players: { type: Array, default: () => [] }
})

defineEmits(['toggle-ready', 'start-game'])
</script>

<style scoped>
.ready-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.ready-btn {
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.ready-btn.not-ready {
  background: #667eea;
  color: white;
}

.ready-btn.not-ready:hover {
  background: #5a6fd8;
  transform: translateY(-2px);
}

.ready-btn.ready {
  background: #2ed573;
  color: white;
}

.ready-btn.ready:hover {
  background: #26d669;
  transform: translateY(-2px);
}

.start-game-btn {
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  background: #ffa502;
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.start-game-btn:hover:not(:disabled) {
  background: #e8940e;
  transform: translateY(-2px);
}

.start-game-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.start-game-hint {
  text-align: center;
  color: #666;
  font-size: 14px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e8ed;
}
</style>
