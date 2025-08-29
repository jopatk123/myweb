<template>
  <div class="shared-game-panel">
    <div class="game-canvas-area">
      <h4>🐍 共享蛇游戏</h4>
      <div class="vote-timer">
        投票倒计时: {{ voteCountdown }}s
      </div>
      
      <!-- 游戏画布区域 -->
      <div class="canvas-placeholder">
        <p>游戏画布区域</p>
        <p>分数: {{ gameState?.score || 0 }}</p>
        <p>长度: {{ gameState?.length || 3 }}</p>
      </div>

      <!-- 投票按钮 -->
      <div class="vote-controls">
        <div class="vote-row">
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'up' }"
            @click="$emit('vote', 'up')"
            :disabled="voteCountdown <= 0"
          >
            ⬆️ 上
          </button>
        </div>
        <div class="vote-row">
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'left' }"
            @click="$emit('vote', 'left')"
            :disabled="voteCountdown <= 0"
          >
            ⬅️ 左
          </button>
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'right' }"
            @click="$emit('vote', 'right')"
            :disabled="voteCountdown <= 0"
          >
            ➡️ 右
          </button>
        </div>
        <div class="vote-row">
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'down' }"
            @click="$emit('vote', 'down')"
            :disabled="voteCountdown <= 0"
          >
            ⬇️ 下
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  gameState: { type: Object, required: true },
  voteCountdown: { type: Number, default: 0 },
  myVote: { type: String, default: null }
})

defineEmits(['vote'])
</script>

<style scoped>
.shared-game-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.game-canvas-area h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.vote-timer {
  color: #ffa502;
  font-weight: bold;
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
}

.canvas-placeholder {
  background: #f8f9fa;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  color: #666;
  margin-bottom: 20px;
}

.vote-controls {
  display: grid;
  gap: 10px;
  max-width: 200px;
  margin: 0 auto;
}

.vote-row {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.vote-btn {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  min-width: 70px;
}

.vote-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f8f9ff;
}

.vote-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
