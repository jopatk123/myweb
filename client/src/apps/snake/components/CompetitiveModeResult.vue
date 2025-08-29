<template>
  <div class="competitive-result">
    <div v-if="gameState?.winner" class="winner-display">
      <div class="winner-icon">🏆</div>
      <div class="winner-info">
        <div class="winner-name">{{ gameState.winner.player_name }}</div>
        <div class="winner-score">获胜分数: {{ getPlayerScore(gameState.winner.session_id) }}</div>
      </div>
    </div>
    
    <div class="final-standings">
      <h4>最终排名</h4>
      <div class="standings-list">
        <div 
          v-for="(player, index) in sortedPlayers" 
          :key="player.session_id"
          class="standing-item"
        >
          <span class="rank">{{ index + 1 }}</span>
          <span 
            class="player-name"
            :style="{ color: player.player_color }"
          >
            {{ player.player_name }}
          </span>
          <span class="player-score">{{ getPlayerScore(player.session_id) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  gameState: { type: Object, required: true },
  players: { type: Array, required: true }
})

const getPlayerScore = (sessionId) => {
  return props.gameState?.snakes?.[sessionId]?.score || 0
}

const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    const scoreA = getPlayerScore(a.session_id)
    const scoreB = getPlayerScore(b.session_id)
    return scoreB - scoreA
  })
})
</script>

<style scoped>
.competitive-result {
  margin-bottom: 30px;
}

.winner-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f0fff4;
  border-radius: 12px;
}

.winner-icon {
  font-size: 48px;
}

.winner-info {
  text-align: left;
}

.winner-name {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
}

.winner-score {
  color: #666;
  font-size: 16px;
}

.final-standings h4 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.standings-list {
  display: grid;
  gap: 10px;
}

.standing-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.rank {
  font-weight: bold;
  color: #2c3e50;
  min-width: 30px;
}

.player-name {
  flex: 1;
  font-weight: 500;
  text-align: left;
  margin-left: 15px;
}

.player-score {
  font-weight: bold;
  color: #667eea;
}

@media (max-width: 768px) {
  .winner-display {
    flex-direction: column;
    text-align: center;
  }
  
  .winner-info {
    text-align: center;
  }
}
</style>
