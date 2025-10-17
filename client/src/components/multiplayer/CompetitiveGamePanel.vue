<template>
  <div class="competitive-panel">
    <canvas
      ref="canvas"
      :width="boardSize * cellSize"
      :height="boardSize * cellSize"
      class="game-canvas"
    />
    <div class="snakes-stats">
      <div
        v-for="(snake, sid) in snakes"
        :key="sid"
        class="snake-item"
        :style="{ borderColor: snake.player?.player_color }"
      >
        <strong :style="{ color: snake.player?.player_color }">{{
          snake.player?.player_name || sid
        }}</strong>
        <span>分: {{ snake.score }}</span>
        <span v-if="snake.gameOver" class="over">淘汰</span>
      </div>
    </div>
    <div class="move-buttons">
      <button @click="$emit('move', 'up')">⬆️</button>
      <div class="h-row">
        <button @click="$emit('move', 'left')">⬅️</button>
        <button @click="$emit('move', 'down')">⬇️</button>
        <button @click="$emit('move', 'right')">➡️</button>
      </div>
    </div>
  </div>
</template>
<script setup>
  import { ref, watch, onMounted, computed } from 'vue';
  const props = defineProps({
    gameState: Object,
    boardSize: { type: Number, default: 20 },
    cellSize: { type: Number, default: 16 },
  });
  const canvas = ref(null);
  const snakes = computed(() => props.gameState?.snakes || {});

  const draw = () => {
    if (!canvas.value) return;
    const ctx = canvas.value.getContext('2d');
    const { boardSize, cellSize } = props;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, boardSize * cellSize, boardSize * cellSize);
    // 画每条蛇与其食物
    Object.entries(snakes.value).forEach(([, snake]) => {
      if (!snake) return;
      ctx.fillStyle = snake.player?.player_color || '#fff';
      snake.body.forEach(seg =>
        ctx.fillRect(seg.x * cellSize, seg.y * cellSize, cellSize, cellSize)
      );
    });
  };
  watch(() => props.gameState, draw, { deep: true });
  onMounted(draw);
</script>
<style scoped>
  .competitive-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .game-canvas {
    background: #000;
    border: 3px solid #222;
    border-radius: 8px;
    image-rendering: pixelated;
  }
  .snakes-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    font-size: 12px;
  }
  .snake-item {
    padding: 6px 10px;
    border: 2px solid #ccc;
    border-radius: 6px;
    display: flex;
    gap: 6px;
    align-items: center;
    background: #fff;
  }
  .snake-item .over {
    color: #dc3545;
    font-weight: 700;
  }
  .move-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .move-buttons button {
    padding: 6px 10px;
    border: 2px solid #ddd;
    background: #fff;
    border-radius: 6px;
    cursor: pointer;
  }
  .move-buttons button:hover {
    border-color: #667eea;
  }
  .h-row {
    display: flex;
    gap: 4px;
  }
</style>
