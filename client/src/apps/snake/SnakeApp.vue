<template>
  <div class="snake-app">
    <SnakeHeader
      :score="score"
      :snake-length="snake.length"
      :level="level"
      :high-score="highScore"
    />

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
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import SnakeHeader from './SnakeHeader.vue';
import SnakeControls from './SnakeControls.vue';
import SnakeCanvas from './SnakeCanvas.vue';
import SnakeOverlays from './SnakeOverlays.vue';
import useSnakeGame from '../../composables/useSnakeGame';
import useSnakeController from '../../composables/useSnakeController';
import './SnakeApp.css';

const snakeCanvas = ref(null);
const boardSize = 400;
const cell = 20;

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
  handleCanvasClick: composableHandleCanvasClick,
} = useSnakeGame();

const {
  start,
  pause,
  restart,
  updateSpeed,
  handleCanvasClick,
  bindEvents,
  unbindEvents,
} = useSnakeController({
  gameStep,
  updateParticles,
  speed,
  snakeCanvasRef: snakeCanvas,
  startGame,
  pauseGame,
  restartGame,
  setDirection,
  composableHandleCanvasClick,
  gameStarted,
  paused,
  gameOver,
});

watch(difficulty, updateSpeed);

onMounted(() => {
  setTimeout(() => {
    snakeCanvas.value?.draw();
  }, 0);
  bindEvents();
});

onBeforeUnmount(() => {
  unbindEvents();
});
</script>
