<template>
  <div class="single-player-game">
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
      :difficulty="difficulty"
      @update:difficulty="val => emit('update:difficulty', val)"
      @start="start"
      @pause="pause"
      @restart="restart"
      @back-to-menu="$emit('back-to-menu')"
    />
  </div>
</template>

<script setup>
  import { ref } from 'vue';
  import SnakeHeader from '../SnakeHeader.vue';
  import SnakeControls from '../SnakeControls.vue';
  import SnakeCanvas from '../SnakeCanvas.vue';
  import SnakeOverlays from '../SnakeOverlays.vue';

  defineProps({
    boardSize: { type: Number, required: true },
    cell: { type: Number, required: true },
    gameStarted: { type: Boolean, required: true },
    gameOver: { type: Boolean, required: true },
    paused: { type: Boolean, required: true },
    score: { type: Number, required: true },
    highScore: { type: Number, required: true },
    level: { type: Number, required: true },
    difficulty: { type: String, required: true },
    snake: { type: Array, required: true },
    food: { type: Object, required: true },
    specialFood: { type: Object, required: false },
    particles: { type: Array, required: true },
    gridSize: { type: Number, required: true },
  });

  const emit = defineEmits([
    'back-to-menu',
    'start',
    'pause',
    'restart',
    'canvas-click',
    'update:difficulty',
  ]);

  const snakeCanvas = ref(null);

  // 转发事件
  const start = () => emit('start');
  const pause = () => emit('pause');
  const restart = () => emit('restart');
  const handleCanvasClick = () => emit('canvas-click');

  // 暴露 canvas 引用给父组件
  defineExpose({ snakeCanvas });
</script>

<style scoped>
  .single-player-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .game-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
