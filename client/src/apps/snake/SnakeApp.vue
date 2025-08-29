<template>
  <div class="snake-app">
    <!-- 游戏模式选择 -->
    <div v-if="gameMode === 'menu'" class="mode-selector">
      <h3>🎮 选择游戏模式</h3>
      <div class="mode-buttons">
        <button 
          class="mode-btn single-mode"
          @click="startSinglePlayer"
        >
          🐍 单人模式
          <small>经典贪吃蛇游戏</small>
        </button>
        <button 
          class="mode-btn multiplayer-mode"
          @click="startMultiplayer"
        >
          👥 多人模式
          <small>与朋友一起玩</small>
        </button>
      </div>
    </div>

    <!-- 多人模式 -->
    <div v-else-if="gameMode === 'multiplayer'" class="multiplayer-mode">
      <!-- 大厅界面 -->
      <SnakeLobby 
        v-if="multiplayerView === 'lobby'"
        @join-room="multiplayerView = 'room'"
        @create-room="multiplayerView = 'room'"
      />
      
      <!-- 房间界面 -->
      <SnakeRoom
        v-else-if="multiplayerView === 'room'"
        @leave-room="multiplayerView = 'lobby'"
        @game-update="handleMultiplayerGameUpdate"
      />
      
      <!-- 返回按钮 -->
      <div class="multiplayer-back">
        <button class="btn btn-secondary" @click="backToMenu">
          返回主菜单
        </button>
      </div>
    </div>

    <!-- 单人模式游戏 -->
    <div v-else-if="gameMode === 'single'" class="single-player-game">
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
        @back-to-menu="backToMenu"
      />
    </div>
  </div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
  import SnakeHeader from './SnakeHeader.vue';
  import SnakeControls from './SnakeControls.vue';
  import SnakeCanvas from './SnakeCanvas.vue';
  import SnakeOverlays from './SnakeOverlays.vue';
  import SnakeLobby from './SnakeLobby.vue';
  import SnakeRoom from './SnakeRoom.vue';
  import useSnakeGame from '../../composables/useSnakeGame.js';
  import useSnakeController from '../../composables/useSnakeController.js';
  import './SnakeApp.css';

  const snakeCanvas = ref(null);
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

  // 开始单人游戏
  const startSinglePlayer = () => {
    gameMode.value = 'single';
  };

  // 开始多人游戏
  const startMultiplayer = () => {
    gameMode.value = 'multiplayer';
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
    console.log('多人游戏更新:', data);
  };

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
