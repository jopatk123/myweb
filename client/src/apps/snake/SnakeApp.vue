<template>
  <div class="snake-app">
    <SnakeHeader :score="score" :snake-length="snake.length" :level="level" :high-score="highScore" />

    <div class="game-container">
      <SnakeCanvas
        ref="snakeCanvas"
        :boardSize="boardSize"
        :cell="cell"
        :snake="snake"
        :food="food"
        :specialFood="specialFood"
        :particles="particles"
        :gridSize="gridSize"
        :gameOver="gameOver"
        @canvas-click="handleCanvasClick"
      />

      <SnakeOverlays
        :gameStarted="gameStarted"
        :gameOver="gameOver"
        :score="score"
        :snakeLength="snake.length"
        @start="start"
        @restart="restart"
      />
    </div>

    <SnakeControls
      :game-started="gameStarted"
      :paused="paused"
      :game-over="gameOver"
      v-model:difficulty="difficulty"
      @start="start"
      @pause="pause"
      @restart="restart"
    />

    <!-- 操作说明区块已删除 -->
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue';
import SnakeHeader from './SnakeHeader.vue';
import SnakeControls from './SnakeControls.vue';
import SnakeCanvas from './SnakeCanvas.vue';
import SnakeOverlays from './SnakeOverlays.vue';
import useSnakeGame from '../../composables/useSnakeGame';

const snakeCanvas = ref(null);
const boardSize = 400;
const cell = 20;
let timer = null;

// 使用 composable 管理游戏状态与逻辑
const {
  gameStarted,
  gameOver,
  paused,
  score,
  highScore,
  level,
  difficulty,
  snake,
  dir,
  food,
  specialFood,
  particles,
  speed,
  gridSize,
  randomFood,
  createSpecialFood,
  addParticles,
  updateParticles,
  checkCollision,
  step: gameStep,
  startGame,
  pauseGame,
  restartGame,
  setDirection,
  handleCanvasClick: composableHandleCanvasClick
} = useSnakeGame();

// 本组件暴露给模板的简短方法（保持原名）
function start() {
  startGame();
  // 启动定时器以执行游戏步进和粒子更新与重绘
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    gameStep();
    updateParticles();
    snakeCanvas.value?.draw();
  }, speed.value);
}

function pause() {
  // 切换暂停状态
  pauseGame();
  if (paused.value) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  } else {
    // 继续
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      gameStep();
      updateParticles();
      snakeCanvas.value?.draw();
    }, speed.value);
  }
}

function restart() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  restartGame();
  // 立即绘制一次重置画面
  snakeCanvas.value?.draw();
}

function updateSpeed() {
  if (timer && gameStarted.value && !paused.value) {
    clearInterval(timer);
    timer = setInterval(() => {
      gameStep();
      updateParticles();
      snakeCanvas.value?.draw();
    }, speed.value);
  }
}

function handleKey(e) {
  if (gameOver.value) return;

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      setDirection({ x: 0, y: -1 });
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      setDirection({ x: 0, y: 1 });
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      setDirection({ x: -1, y: 0 });
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      setDirection({ x: 1, y: 0 });
      break;
    case ' ':
      e.preventDefault();
      pause();
      break;
  }
}

function handleCanvasClick() {
  composableHandleCanvasClick();
  // 点击开始游戏时也需要启动定时器
  if (gameStarted.value && !timer) {
    timer = setInterval(() => {
      gameStep();
      updateParticles();
      snakeCanvas.value?.draw();
    }, speed.value);
  }
}

// 移除本组件内拖动逻辑，统一由 AppLauncherModal 控制

// 监听难度变化
watch(difficulty, updateSpeed);

onMounted(() => {
  // canvas 由子组件管理，调用子组件 draw
  // 确保子组件已挂载后触发首次绘制
  setTimeout(() => {
    snakeCanvas.value?.draw();
  }, 0);
  window.addEventListener('keydown', handleKey);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKey);
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.snake-app {
  display: inline-block; /* 紧凑包裹内容 */
  vertical-align: top;
  padding: 12px; /* 略小内边距以保持紧凑 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.15);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

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
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
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

.game-container {
  position: relative;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

canvas {
  background: #1a1a1a;
  border-radius: 15px;
  border: 3px solid #333;
  transition: all 0.3s ease;
}

canvas:hover {
  transform: scale(1.02);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

canvas.game-over {
  border-color: #ff4757;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.game-over-modal,
.start-modal {
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.game-over-modal h3,
.start-modal h3 {
  color: #ff4757;
  margin: 0 0 15px 0;
  font-size: 1.8rem;
}

.start-modal h3 {
  color: #4ade80;
}

.game-over-modal p,
.start-modal p {
  margin: 10px 0;
  color: #333;
  font-size: 1.1rem;
}

.game-controls {
  display: flex;
  gap: 30px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.difficulty-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

.difficulty-controls label {
  font-weight: bold;
}

.difficulty-controls select {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
}

.difficulty-controls select option {
  background: #333;
  color: white;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(45deg, #4ade80, #22c55e);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(45deg, #22c55e, #16a34a);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.instructions {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  text-align: center;
}

.instructions h4 {
  margin: 0 0 15px 0;
  font-size: 1.3rem;
}

.instruction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.instruction-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.key {
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 10px;
  border-radius: 5px;
  font-family: monospace;
  font-weight: bold;
  min-width: 40px;
  text-align: center;
}

@media (max-width: 768px) {
  .snake-app {
    padding: 10px;
  }
  
  .game-title {
    font-size: 2rem;
  }
  
  .game-stats {
    gap: 15px;
  }
  
  .stat-item {
    padding: 8px 12px;
  }
  
  .game-controls {
    flex-direction: column;
    gap: 15px;
  }
  
  .instruction-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>


