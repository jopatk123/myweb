<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>🏆 排行榜</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="mode-tabs">
          <button 
            class="mode-tab"
            :class="{ active: mode === 'all' }"
            @click="$emit('switch-mode', 'all')"
          >
            全部
          </button>
          <button 
            class="mode-tab"
            :class="{ active: mode === 'shared' }"
            @click="$emit('switch-mode', 'shared')"
          >
            共享模式
          </button>
          <button 
            class="mode-tab"
            :class="{ active: mode === 'competitive' }"
            @click="$emit('switch-mode', 'competitive')"
          >
            竞技模式
          </button>
        </div>

        <div v-if="!leaderboard.length" class="empty-state">
          <div class="empty-icon">🏆</div>
          <p>暂无排行榜数据</p>
        </div>

        <div v-else class="leaderboard-list">
          <div 
            v-for="(player, index) in leaderboard" 
            :key="player.id"
            class="leaderboard-item"
            :class="{ 'top-three': index < 3 }"
          >
            <div class="rank">
              <span v-if="index === 0" class="rank-icon">🥇</span>
              <span v-else-if="index === 1" class="rank-icon">🥈</span>
              <span v-else-if="index === 2" class="rank-icon">🥉</span>
              <span v-else class="rank-number">{{ index + 1 }}</span>
            </div>
            
            <div class="player-info">
              <div class="player-name">{{ player.playerName || player.name }}</div>
              <div class="player-stats">
                {{ player.totalGames || 0 }} 场游戏 · 胜率 {{ getWinRate(player) }}%
              </div>
            </div>
            
            <div class="player-score">
              <div class="score-value">{{ player.highestScore || 0 }}</div>
              <div class="score-label">最高分</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  leaderboard: { type: Array, default: () => [] },
  mode: { type: String, default: 'all' }
})

defineEmits(['close', 'switch-mode'])

const getWinRate = (player) => {
  if (!player.totalGames) return 0
  return Math.round(((player.wins || 0) / player.totalGames) * 100)
}
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

.mode-tabs {
  display: flex;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 25px;
}

.mode-tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  color: #666;
}

.mode-tab.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-tab:hover:not(.active) {
  background: rgba(255, 255, 255, 0.5);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  gap: 16px;
}

.leaderboard-item.top-three {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
}

.rank {
  width: 40px;
  text-align: center;
}

.rank-icon {
  font-size: 24px;
}

.rank-number {
  font-weight: bold;
  font-size: 18px;
  color: #666;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.player-stats {
  color: #666;
  font-size: 14px;
}

.player-score {
  text-align: center;
}

.score-value {
  font-weight: bold;
  color: #667eea;
  font-size: 18px;
}

.score-label {
  color: #666;
  font-size: 12px;
}

@media (max-width: 768px) {
  .leaderboard-item {
    padding: 12px;
    gap: 12px;
  }
  
  .rank {
    width: 30px;
  }
  
  .rank-icon {
    font-size: 20px;
  }
  
  .rank-number {
    font-size: 16px;
  }
}
</style>
