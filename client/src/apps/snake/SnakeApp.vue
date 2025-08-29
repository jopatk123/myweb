<template>
  <div class="snake-app">
    <!-- 多人模式 -->
    <div v-if="gameMode === 'multiplayer'">
      <!-- 游戏大厅 -->
  <SnakeLobbyAdapter
        v-if="multiplayerView === 'lobby'"
        @join-room="multiplayerView = 'room'"
        @create-room="multiplayerView = 'room'"
      />
      
      <!-- 游戏房间 -->
      <SnakeRoom
        v-else-if="multiplayerView === 'room'"
        @leave-room="handleLeaveMultiplayerRoom"
      />
    </div>

    <!-- 单人模式（原有游戏） -->
    <div v-else class="single-player-game">
      <!-- 游戏模式选择 -->
      <div v-if="!gameStarted && !gameOver" class="mode-selector">
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

      <!-- 原有的单人游戏界面 -->
      <div v-else>
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

    <!-- 自动弹出通知 -->
    <div v-if="autoPopupNotification" class="auto-popup-notification">
      <div class="notification-content">
        <h4>🎮 多人游戏邀请</h4>
        <p>{{ autoPopupNotification.message }}</p>
        <div class="notification-actions">
          <button class="btn-join" @click="joinAutoPopupGame">
            🚀 立即加入
          </button>
          <button class="btn-dismiss" @click="dismissAutoPopup">
            ❌ 忽略
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
  import SnakeHeader from './SnakeHeader.vue';
  import SnakeControls from './SnakeControls.vue';
  import SnakeCanvas from './SnakeCanvas.vue';
  import SnakeOverlays from './SnakeOverlays.vue';
  import SnakeLobbyAdapter from './SnakeLobbyAdapter.vue';
  import SnakeRoom from './SnakeRoom.vue';
  import useSnakeGame from '../../composables/useSnakeGame';
  import useSnakeController from '../../composables/useSnakeController';
  import { useRoute } from 'vue-router';
  import './SnakeApp.css';

  const route = useRoute();
  const snakeCanvas = ref(null);
  const boardSize = 400;
  const cell = 20;

  // 游戏模式状态
  const gameMode = ref('menu'); // 'menu', 'single', 'multiplayer'
  const multiplayerView = ref('lobby'); // 'lobby', 'room'
  const autoPopupNotification = ref(null);

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
    multiplayerView.value = 'lobby';
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

  // 离开多人房间
  const handleLeaveMultiplayerRoom = () => {
    multiplayerView.value = 'lobby';
  };

  // 处理自动弹出游戏邀请
  const handleAutoPopup = (event) => {
    const data = event.detail;
    autoPopupNotification.value = data;
  };

  // 加入自动弹出的游戏
  const joinAutoPopupGame = () => {
    gameMode.value = 'multiplayer';
    multiplayerView.value = 'lobby';
    autoPopupNotification.value = null;
    
    // 这里可以直接尝试加入房间
    // 需要传递房间码给SnakeLobby组件
  };

  // 忽略自动弹出
  const dismissAutoPopup = () => {
    autoPopupNotification.value = null;
  };

  // 检查URL参数，支持直接加入游戏
  const checkUrlParams = () => {
    const joinRoomCode = route.query.join;
    if (joinRoomCode) {
      gameMode.value = 'multiplayer';
      multiplayerView.value = 'lobby';
      // 这里可以自动填充房间码
    }
  };

  watch(difficulty, updateSpeed);

  onMounted(() => {
    setTimeout(() => {
      snakeCanvas.value?.draw();
    }, 0);
    bindEvents();
    checkUrlParams();
    
    // 监听自动弹出事件
    window.addEventListener('snakeAutoPopup', handleAutoPopup);
  });

  onBeforeUnmount(() => {
    unbindEvents();
    window.removeEventListener('snakeAutoPopup', handleAutoPopup);
  });
</script>
