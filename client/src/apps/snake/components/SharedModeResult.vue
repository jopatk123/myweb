<template>
  <div class="shared-result">
    <div class="final-score">
      <span class="score-label">最终分数</span>
      <span class="score-value">{{ gameState?.sharedSnake?.score || 0 }}</span>
    </div>

    <div class="final-length">
      <span class="length-label">最终长度</span>
      <span class="length-value">{{
        gameState?.sharedSnake?.length || 3
      }}</span>
    </div>

    <div class="participants">
      <h4>参与玩家</h4>
      <div class="participant-list">
        <div
          v-for="player in players"
          :key="player.session_id"
          class="participant"
          :style="{ color: player.player_color }"
        >
          {{ player.player_name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    gameState: { type: Object, required: true },
    players: { type: Array, required: true },
  });
</script>

<style scoped>
  .shared-result {
    display: grid;
    gap: 20px;
    margin-bottom: 30px;
  }

  .final-score,
  .final-length {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .score-label,
  .length-label {
    font-weight: 500;
    color: #2c3e50;
  }

  .score-value {
    font-size: 20px;
    font-weight: bold;
    color: #667eea;
  }

  .length-value {
    font-size: 20px;
    font-weight: bold;
    color: #2ed573;
  }

  .participants h4 {
    margin: 0 0 15px 0;
    color: #2c3e50;
  }

  .participant-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
  }

  .participant {
    font-weight: 500;
    padding: 5px 10px;
    background: #f8f9fa;
    border-radius: 15px;
  }
</style>
