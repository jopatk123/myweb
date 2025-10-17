<template>
  <div class="game-info-bar">
    <div class="score-display">
      <span class="score-label">分数</span>
      <span class="score-value">{{ gameState?.sharedSnake?.score || 0 }}</span>
    </div>

    <div class="length-display">
      <span class="length-label">长度</span>
      <span class="length-value">{{
        gameState?.sharedSnake?.length || 3
      }}</span>
    </div>

    <div class="vote-timer">
      <span class="timer-label">投票倒计时</span>
      <span class="timer-value">{{ voteTimeout }}s</span>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    gameState: { type: Object, required: true },
    voteTimeout: { type: Number, default: 0 },
  });
</script>

<style scoped>
  .game-info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .score-display,
  .length-display,
  .vote-timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .score-label,
  .length-label,
  .timer-label {
    color: #666;
    font-size: 14px;
    font-weight: 500;
  }

  .score-value {
    color: #667eea;
    font-size: 24px;
    font-weight: bold;
  }

  .length-value {
    color: #2ed573;
    font-size: 24px;
    font-weight: bold;
  }

  .timer-value {
    color: #ffa502;
    font-size: 20px;
    font-weight: bold;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  @media (max-width: 768px) {
    .game-info-bar {
      flex-direction: column;
      gap: 15px;
    }
  }
</style>
