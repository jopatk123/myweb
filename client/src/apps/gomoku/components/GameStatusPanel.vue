<template>
  <div class="game-status-panel">
    <!-- 游戏模式显示 -->
    <div class="mode-display">
      <div class="mode-icon">🤖</div>
      <div class="mode-info">
        <h4>{{ getModeTitle() }}</h4>
        <p>{{ getModeDescription() }}</p>
      </div>
    </div>

    <!-- 玩家信息 -->
    <div class="players-info">
      <div 
        class="player-card" 
        :class="{ active: currentPlayer === 1 && !gameOver }"
      >
        <div class="player-avatar">⚫</div>
        <div class="player-details">
          <h5>{{ player1Name }}</h5>
          <span class="player-type">{{ getPlayerType(1) }}</span>
        </div>
  <div v-if="isAiThinking && currentAIPlayer === 1" class="thinking-indicator">
          <div class="spinner-small"></div>
        </div>
      </div>

      <div class="vs-divider">VS</div>

      <div 
        class="player-card" 
        :class="{ active: currentPlayer === 2 && !gameOver }"
      >
        <div class="player-avatar">⚪</div>
        <div class="player-details">
          <h5>{{ player2Name }}</h5>
          <span class="player-type">{{ getPlayerType(2) }}</span>
        </div>
  <div v-if="isAiThinking && currentAIPlayer === 2" class="thinking-indicator">
          <div class="spinner-small"></div>
        </div>
      </div>
    </div>

    <!-- 游戏统计 -->
    <div class="game-stats">
      <div class="stat-item">
        <span class="stat-number">{{ moveCount }}</span>
        <span class="stat-label">步数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ playerWins }}</span>
        <span class="stat-label">胜场</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ winRate }}%</span>
        <span class="stat-label">胜率</span>
      </div>
    </div>

    <!-- 最后一步信息 -->
    <div v-if="lastMove && lastMove.reasoning" class="last-move-info">
      <h5>💭 AI思路</h5>
      <p>{{ lastMove.reasoning }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  gameMode: {
    type: String,
    default: 'human_vs_ai',
  },
  currentPlayer: {
    type: Number,
    required: true,
  },
  gameOver: {
    type: Boolean,
    default: false,
  },
  isAiThinking: {
    type: Boolean,
    default: false,
  },
  currentAIPlayer: {
    type: Number,
    default: null,
  },
  player1Name: {
    type: String,
    default: '黑子',
  },
  player2Name: {
    type: String,
    default: '白子',
  },
  moveCount: {
    type: Number,
    default: 0,
  },
  playerWins: {
    type: Number,
    default: 0,
  },
  totalGames: {
    type: Number,
    default: 0,
  },
  lastMove: {
    type: Object,
    default: null,
  },
  gameModeInfo: {
    type: Object,
    default: () => ({}),
  },
});

const winRate = computed(() => {
  if (props.totalGames === 0) return 0;
  return Math.round((props.playerWins / props.totalGames) * 100);
});

function getModeTitle() {
  if (props.gameMode === 'ai_vs_ai') {
    return 'AI对AI对战';
  }
  return '人机对战';
}

function getModeDescription() {
  if (props.gameMode === 'ai_vs_ai') {
    return '观看两个AI大模型的智慧对决';
  }
  return '挑战AI大模型的智慧';
}

function getPlayerType(playerNumber) {
  if (props.gameModeInfo.players && props.gameModeInfo.players[playerNumber]) {
    const player = props.gameModeInfo.players[playerNumber];
    return player.type === 'human' ? '人类玩家' : 'AI模型';
  }
  return playerNumber === 1 ? '人类玩家' : 'AI模型';
}
</script>

<style scoped>
.game-status-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  min-width: 280px;
}

.mode-display {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.mode-icon {
  font-size: 2rem;
}

.mode-info h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  color: #fff;
}

.mode-info p {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.players-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.player-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.player-card.active {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}

.player-avatar {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.player-details h5 {
  margin: 0 0 3px 0;
  font-size: 0.95rem;
  color: #fff;
}

.player-type {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.vs-divider {
  font-weight: bold;
  color: #f59e0b;
  font-size: 0.9rem;
}

.thinking-indicator {
  margin-left: auto;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.game-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-number {
  display: block;
  font-size: 1.3rem;
  font-weight: bold;
  color: #4ade80;
  margin-bottom: 3px;
}

.stat-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
}

.last-move-info {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  padding: 12px;
}

.last-move-info h5 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: #a78bfa;
}

.last-move-info p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .game-status-panel {
    min-width: auto;
    padding: 15px;
  }
  
  .players-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .player-card {
    width: 100%;
  }
  
  .vs-divider {
    transform: rotate(90deg);
  }
  
  .game-stats {
    gap: 10px;
  }
}
</style>