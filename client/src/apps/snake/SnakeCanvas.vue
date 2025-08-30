<template>
  <canvas
    ref="canvas"
    :width="boardSize"
    :height="boardSize"
    :class="{ 'game-over': gameOver }"
    @click="onClick"
  ></canvas>
</template>

<script setup>
  import { ref, onMounted } from 'vue';
  import { CanvasRenderer } from './utils/canvasRenderer.js';

  const props = defineProps({
    boardSize: { type: Number, required: true },
    cell: { type: Number, required: true },
    // 单蛇模式（共享）
    snake: { type: Array, required: false, default: () => [] },
    // 多蛇模式（竞技），可传对象 { sessionId: { body: [...], player: {...}, ... } }
    snakes: { type: Object, required: false, default: () => null },
    // 兼容：旧 props.food 单个；新增 props.foods 多个
    food: { type: Object, required: true },
    foods: { type: Array, required: false, default: () => [] },
    specialFood: { type: Object, required: false },
    particles: { type: Array, required: true },
    gridSize: { type: Number, required: true },
    gameOver: { type: Boolean, required: false, default: false },
    // 当前本地玩家 sessionId，用于高亮其蛇
    activeSessionId: { type: String, required: false, default: null },
  });

  const emit = defineEmits(['canvas-click']);

  const canvas = ref(null);
  let renderer = null;

  function onClick() {
    emit('canvas-click');
  }

  function draw() {
    if (!renderer) return;
    
    // 清空画布
    renderer.clearCanvas();
    
    // 绘制网格
    renderer.drawGrid(props.gridSize);
    
    // 绘制食物
    if (props.foods && props.foods.length) {
      renderer.drawMultipleFoods(props.foods);
    } else if (props.food) {
      renderer.drawFood(props.food, 0);
    }
    
    // 绘制特殊食物
    renderer.drawSpecialFood(props.specialFood);
    
    // 绘制蛇
    if (props.snakes && Object.keys(props.snakes).length) {
      renderer.drawMultipleSnakes(props.snakes, props.activeSessionId);
    } else if (props.snake && props.snake.length) {
      renderer.drawSingleSnake(props.snake, '#4ade80');
    }
    
    // 绘制粒子效果
    renderer.drawParticles(props.particles);
  }

  onMounted(() => {
    const ctx = canvas.value.getContext('2d');
    renderer = new CanvasRenderer(ctx, props.boardSize, props.cell);
    draw();
  });

  defineExpose({ draw });
</script>

<style scoped>
  canvas {
    background: #1a1a1a;
    border-radius: 15px;
    border: 3px solid #333;
    transition: all 0.3s ease;
  }

  canvas.game-over {
    border-color: #ff4757;
    animation: shake 0.5s ease-in-out;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }
</style>
