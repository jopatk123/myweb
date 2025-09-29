<template>
  <div class="game-header">
    <h2 class="game-title">🐍 贪吃蛇大作战</h2>
    <div class="game-stats">
      <div class="stat-item">
        <span class="stat-label">分数</span>
        <span class="stat-value">{{ score }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">长度</span>
        <span class="stat-value">{{ snakeLength }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">等级</span>
        <span class="stat-value">{{ level }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">最高分</span>
        <span class="stat-value">{{ highScore }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    score: { type: Number, required: true },
    snakeLength: { type: Number, required: true },
    level: { type: Number, required: true },
    highScore: { type: Number, required: true },
  });
</script>

<style scoped>
  .game-header {
    text-align: center;
    color: white;
  }

  .game-title {
    font-size: 2.5rem;
    margin: 0 0 20px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .game-stats {
    display: flex;
    gap: 30px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 10px 15px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.8;
    margin-bottom: 5px;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #4ade80;
  }
</style>
