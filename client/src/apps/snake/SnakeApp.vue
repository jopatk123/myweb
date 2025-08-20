<template>
  <div class="snake-app">
    <canvas ref="canvas" :width="boardSize" :height="boardSize"></canvas>
    <div class="controls">
      <button class="btn btn-sm" @click="start">开始</button>
      <button class="btn btn-sm" @click="pause">暂停</button>
      <span>分数：{{ score }}</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

const canvas = ref(null);
const ctx = ref(null);
const boardSize = 300;
const cell = 15;
let timer = null;

const snake = ref([
  { x: 7, y: 10 },
  { x: 6, y: 10 },
  { x: 5, y: 10 }
]);
const dir = ref({ x: 1, y: 0 });
const food = ref({ x: 10, y: 10 });
const score = ref(0);

function randomFood() {
  food.value = { x: Math.floor(Math.random() * (boardSize / cell)), y: Math.floor(Math.random() * (boardSize / cell)) };
}

function draw() {
  if (!ctx.value) return;
  ctx.value.fillStyle = '#111';
  ctx.value.fillRect(0, 0, boardSize, boardSize);

  // food
  ctx.value.fillStyle = '#f00';
  ctx.value.fillRect(food.value.x * cell, food.value.y * cell, cell, cell);

  // snake
  ctx.value.fillStyle = '#0f0';
  for (const s of snake.value) {
    ctx.value.fillRect(s.x * cell, s.y * cell, cell, cell);
  }
}

function step() {
  const head = { x: snake.value[0].x + dir.value.x, y: snake.value[0].y + dir.value.y };
  // wrap around
  head.x = (head.x + (boardSize / cell)) % (boardSize / cell);
  head.y = (head.y + (boardSize / cell)) % (boardSize / cell);

  // eat
  if (head.x === food.value.x && head.y === food.value.y) {
    snake.value.unshift(head);
    score.value += 1;
    randomFood();
  } else {
    snake.value.pop();
    snake.value.unshift(head);
  }

  draw();
}

function start() {
  if (timer) return;
  timer = setInterval(step, 120);
}
function pause() {
  if (timer) { clearInterval(timer); timer = null; }
}

function handleKey(e) {
  if (e.key === 'ArrowUp' && dir.value.y !== 1) dir.value = { x: 0, y: -1 };
  if (e.key === 'ArrowDown' && dir.value.y !== -1) dir.value = { x: 0, y: 1 };
  if (e.key === 'ArrowLeft' && dir.value.x !== 1) dir.value = { x: -1, y: 0 };
  if (e.key === 'ArrowRight' && dir.value.x !== -1) dir.value = { x: 1, y: 0 };
}

onMounted(() => {
  ctx.value = canvas.value.getContext('2d');
  draw();
  window.addEventListener('keydown', handleKey);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKey);
  pause();
});
</script>

<style scoped>
.snake-app { display: flex; flex-direction: column; align-items: center; gap: 10px; }
canvas { background: #111; border-radius: 8px; border: 1px solid #333; }
.controls { display: flex; gap: 10px; align-items: center; }
</style>


