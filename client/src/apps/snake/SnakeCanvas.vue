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

  const props = defineProps({
    boardSize: { type: Number, required: true },
    cell: { type: Number, required: true },
    snake: { type: Array, required: true },
    food: { type: Object, required: true },
    specialFood: { type: Object, required: false },
    particles: { type: Array, required: true },
    gridSize: { type: Number, required: true },
    gameOver: { type: Boolean, required: true },
  });

  const emit = defineEmits(['canvas-click']);

  const canvas = ref(null);
  let ctx = null;

  function onClick() {
    emit('canvas-click');
  }

  function drawParticles() {
    props.particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawGrid() {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= props.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * props.cell, 0);
      ctx.lineTo(i * props.cell, props.boardSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * props.cell);
      ctx.lineTo(props.boardSize, i * props.cell);
      ctx.stroke();
    }
  }

  function drawSnake() {
    props.snake.forEach((segment, index) => {
      const x = segment.x * props.cell;
      const y = segment.y * props.cell;
      if (index === 0) {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(x + 2, y + 2, props.cell - 4, props.cell - 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 5, y + 5, 3, 3);
        ctx.fillRect(x + 12, y + 5, 3, 3);
      } else {
        const greenValue = Math.max(50, 255 - index * 10);
        ctx.fillStyle = `rgb(74, ${greenValue}, 128)`;
        ctx.fillRect(x + 1, y + 1, props.cell - 2, props.cell - 2);
      }
    });
  }

  function drawFood() {
    const x = props.food.x * props.cell;
    const y = props.food.y * props.cell;
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(x + 2, y + 2, props.cell - 4, props.cell - 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(x + 4, y + 4, props.cell - 8, props.cell - 8);
  }

  function drawSpecialFood() {
    if (!props.specialFood) return;
    const x = props.specialFood.x * props.cell;
    const y = props.specialFood.y * props.cell;
    const time = Date.now() * 0.01;
    const alpha = 0.5 + 0.5 * Math.sin(time);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 1, y + 1, props.cell - 2, props.cell - 2);
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', x + props.cell / 2, y + props.cell / 2 + 4);
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, props.boardSize, props.boardSize);
    drawGrid();
    drawFood();
    drawSpecialFood();
    drawSnake();
    drawParticles();
  }

  onMounted(() => {
    ctx = canvas.value.getContext('2d');
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
