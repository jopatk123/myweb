<template>
  <div class="player-stats">
    <div class="stat-item">
      <span class="stat-label">已准备:</span>
      <span class="stat-value">{{ readyCount }}/{{ playerCount }}</span>
    </div>
    <div
      v-if="allReady && playerCount >= minPlayers"
      class="all-ready-indicator"
    >
      🎮 所有玩家已准备，可以开始游戏！
    </div>
  </div>
</template>
<script>
  export default {
    name: 'PlayerStats',
    props: {
      readyCount: { type: Number, required: true },
      playerCount: { type: Number, required: true },
      allReady: { type: Boolean, required: true },
      minPlayers: { type: Number, default: 1 },
    },
  };
</script>
<style scoped>
  .player-stats {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 2px solid #f8f9fa;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  .stat-label {
    color: #6c757d;
  }
  .stat-value {
    font-weight: 600;
    color: #212529;
  }
  .all-ready-indicator {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    color: #155724;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    border: 1px solid #c3e6cb;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
  }
</style>
