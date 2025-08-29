<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>📊 统计信息</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <div v-if="!stats" class="loading-state">
          <div class="loading-spinner"></div>
          <span>加载统计信息...</span>
        </div>
        
        <div v-else class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalGames || 0 }}</div>
            <div class="stat-label">总游戏数</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ stats.wins || 0 }}</div>
            <div class="stat-label">胜利次数</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ winRate }}%</div>
            <div class="stat-label">胜率</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ stats.highestScore || 0 }}</div>
            <div class="stat-label">最高分</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ stats.longestSnake || 3 }}</div>
            <div class="stat-label">最长蛇身</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalPlayTime || '0' }}h</div>
            <div class="stat-label">游戏时长</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: { type: Object, default: null }
})

defineEmits(['close'])

const winRate = computed(() => {
  if (!props.stats || !props.stats.totalGames) return 0
  return Math.round((props.stats.wins / props.stats.totalGames) * 100)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
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

.modal-content {
  background: white;
  border-radius: 15px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #e1e8ed;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #ff4757;
}

.modal-body {
  padding: 25px;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-card {
    padding: 15px;
  }
  
  .stat-value {
    font-size: 24px;
  }
}
</style>
