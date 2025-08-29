<template>
  <div class="lobby-header">
    <h2>🐍 多人贪吃蛇</h2>
    <div class="header-actions">
      <button class="btn-secondary" @click="$emit('show-stats')">
        📊 统计信息
      </button>
      <button class="btn-secondary" @click="$emit('show-leaderboard')">
        🏆 排行榜
      </button>
      <button class="btn-secondary" @click="$emit('refresh-rooms')" :disabled="loading">
        🔄 刷新房间
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false }
})

defineEmits(['show-stats', 'show-leaderboard', 'refresh-rooms'])
</script>

<style scoped>
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  color: white;
}

.lobby-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
