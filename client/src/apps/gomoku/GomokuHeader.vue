<template>
  <div class="gomoku-header">
    <h2 class="game-title">五子棋</h2>

    <div class="game-stats">
      <div class="stat-item">
        <span class="stat-label">当前回合</span>
        <span class="stat-value" :class="currentPlayerClass">
          {{ currentPlayerText }}
        </span>
      </div>

      <div class="stat-item">
        <span class="stat-label">步数</span>
        <span class="stat-value">{{ moveCount }}</span>
      </div>

      <div class="stat-item">
        <span class="stat-label">胜率</span>
        <span class="stat-value">{{ winRate }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    currentPlayer: {
      type: Number,
      required: true,
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
    gameOver: {
      type: Boolean,
      default: false,
    },
    isAiThinking: {
      type: Boolean,
      default: false,
    },
    currentAIPlayerName: {
      type: String,
      default: '',
    },
    player1Name: {
      type: String,
      default: '黑子',
    },
    player2Name: {
      type: String,
      default: '白子',
    },
    gameMode: {
      type: String,
      default: 'human_vs_ai',
    },
  });

  const currentPlayerText = computed(() => {
    if (props.gameOver) return '游戏结束';
    if (props.isAiThinking) {
      return props.currentAIPlayerName
        ? `${props.currentAIPlayerName}思考中...`
        : 'AI思考中...';
    }
    return props.currentPlayer === 1
      ? props.player1Name || '黑子'
      : props.player2Name || '白子';
  });

  const currentPlayerClass = computed(() => {
    if (props.gameOver) return 'game-over';
    if (props.isAiThinking) return 'ai-thinking';
    return props.currentPlayer === 1 ? 'player-turn' : 'ai-turn';
  });

  const winRate = computed(() => {
    if (props.totalGames === 0) return 0;
    return Math.round((props.playerWins / props.totalGames) * 100);
  });
</script>

<style scoped>
  .gomoku-header {
    text-align: center;
    color: white;
    margin-bottom: 20px;
  }

  .game-title {
    font-size: 2.5rem;
    margin: 0 0 20px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .game-stats {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: 80px;
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.8;
    margin-bottom: 5px;
  }

  .stat-value {
    font-size: 1.3rem;
    font-weight: bold;
    transition: all 0.3s ease;
  }

  .player-turn {
    color: #4ade80;
    animation: pulse 1.5s infinite;
  }

  .ai-turn {
    color: #f59e0b;
    animation: thinking 2s infinite;
  }

  .game-over {
    color: #ef4444;
  }

  .ai-thinking {
    color: #8b5cf6;
    animation: thinking 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes thinking {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  @media (max-width: 768px) {
    .game-title {
      font-size: 2rem;
    }

    .game-stats {
      gap: 15px;
    }

    .stat-item {
      padding: 10px 12px;
      min-width: 70px;
    }

    .stat-value {
      font-size: 1.1rem;
    }
  }
</style>
