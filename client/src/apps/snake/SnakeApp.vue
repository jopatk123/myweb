<template>
  <div class="snake-app">
    <!-- 游戏模式选择 -->
    <GameModeSelector 
      v-if="gameMode === 'menu'"
      @select-mode="handleModeSelect"
    />

    <!-- 多人模式 -->
    <MultiplayerGame
      v-else-if="gameMode === 'multiplayer'"
      :multiplayer-view="multiplayerView"
      @back-to-menu="backToMenu"
      @join-room="multiplayerView = 'room'"
      @create-room="multiplayerView = 'room'"
      @leave-room="multiplayerView = 'lobby'"
      @game-update="handleMultiplayerGameUpdate"
    />

    <!-- 单人模式游戏 -->
    <SinglePlayerGame
      v-else-if="gameMode === 'single'"
      ref="singlePlayerGame"
      :board-size="boardSize"
      :cell="cell"
      :game-started="gameStarted"
      :game-over="gameOver"
      :paused="paused"
      :score="score"
      :high-score="highScore"
      :level="level"
      v-model:difficulty="difficulty"
      :snake="snake"
      :food="food"
      :special-food="specialFood"
      :particles="particles"
      :grid-size="gridSize"
      @back-to-menu="backToMenu"
      @start="start"
      @pause="pause"
      @restart="restart"
      @canvas-click="handleCanvasClick"
    />
  </div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
  import GameModeSelector from './components/GameModeSelector.vue';
  import SinglePlayerGame from './components/SinglePlayerGame.vue';
  import MultiplayerGame from './components/MultiplayerGame.vue';
  import useSnakeGame from '../../composables/useSnakeGame.js';
  import useSnakeController from '../../composables/useSnakeController.js';
  import './SnakeApp.css';

  const singlePlayerGame = ref(null);
  const boardSize = 400;
  const cell = 20;

  // 游戏模式状态
  const gameMode = ref('menu'); // 'menu', 'single', 'multiplayer'
  const multiplayerView = ref('lobby'); // 'lobby', 'room'

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

  // 获取单人游戏组件的 canvas 引用
  const getSnakeCanvasRef = () => {
    return singlePlayerGame.value?.snakeCanvas;
  };

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
    snakeCanvasRef: getSnakeCanvasRef,
    startGame,
    pauseGame,
    restartGame,
    setDirection,
    composableHandleCanvasClick,
    gameStarted,
    paused,
    gameOver,
  });

  // 处理模式选择
  const handleModeSelect = (mode) => {
    if (mode === 'single') {
      gameMode.value = 'single';
    } else if (mode === 'multiplayer') {
      gameMode.value = 'multiplayer';
    }
  };

  // 返回主菜单
  const backToMenu = () => {
    gameMode.value = 'menu';
    multiplayerView.value = 'lobby';
    
    // 重置游戏状态
    if (gameStarted.value || gameOver.value) {
      restart();
    }
  };

  // 处理多人游戏更新
  const handleMultiplayerGameUpdate = (data) => {
  // multiplayer game update received — debug log removed
  };

  watch(difficulty, updateSpeed);

  onMounted(() => {
    setTimeout(() => {
      getSnakeCanvasRef()?.draw();
    }, 100);
    bindEvents();
  });

  onBeforeUnmount(() => {
    unbindEvents();
  });
</script>
