<template>
  <div class="shared-game-panel">
    <canvas
      ref="canvas"
      :width="boardSize * cellSize"
      :height="boardSize * cellSize"
      class="game-canvas"
    />
    <div class="score-bar">
      <span>分数: {{ gameState?.sharedSnake?.score || 0 }}</span>
      <span>长度: {{ gameState?.sharedSnake?.body?.length || 0 }}</span>
      <span v-if="voteCountdown > 0">投票中: {{ voteCountdown }}s</span>
    </div>
    <VoteButtons
      :current-vote="myVote"
      mode="shared"
      @vote="$emit('vote', $event)"
    />
  </div>
</template>
<script setup>
  import { ref, watch, onMounted } from 'vue';
  import VoteButtons from './VoteButtons.vue';

  const props = defineProps({
    gameState: Object,
    boardSize: { type: Number, default: 20 },
    cellSize: { type: Number, default: 16 },
    voteCountdown: { type: Number, default: 0 },
    myVote: String,
  });
  const canvas = ref(null);

  const draw = () => {
    if (!canvas.value || !props.gameState?.sharedSnake) return;
    const ctx = canvas.value.getContext('2d');
    const { boardSize, cellSize } = props;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, boardSize * cellSize, boardSize * cellSize);
    // 食物
    const food = props.gameState.food;
    if (food) {
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
    }
    // 蛇
    ctx.fillStyle = '#4cd137';
    props.gameState.sharedSnake.body.forEach((seg, i) => {
      ctx.globalAlpha = 1 - i * 0.02;
      ctx.fillRect(seg.x * cellSize, seg.y * cellSize, cellSize, cellSize);
    });
    ctx.globalAlpha = 1;
  };

  watch(() => props.gameState, draw, { deep: true });
  watch(() => props.gameState?.sharedSnake?.body?.length, draw);

  onMounted(draw);
</script>
<style scoped>
  .shared-game-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .game-canvas {
    background: #111;
    border: 3px solid #333;
    border-radius: 8px;
    image-rendering: pixelated;
  }
  .score-bar {
    display: flex;
    gap: 16px;
    font-size: 14px;
    font-weight: 600;
    color: #444;
  }
</style>
