<template>
  <div class="gomoku-app">
    <GomokuHeader
      :current-player="gameLogic.currentPlayer"
      :move-count="gameLogic.moveHistory.length"
      :player-wins="playerWins"
      :total-games="totalGames"
      :game-over="gameLogic.gameOver"
    />

    <div class="game-container">
      <GomokuBoard
        ref="gomokuBoard"
        :board="gameLogic.board"
        :current-player="gameLogic.currentPlayer"
        :game-over="gameLogic.gameOver"
        :last-move="lastMove"
        @move="handlePlayerMove"
      />

      <GomokuOverlays
        :game-started="gameStarted"
        :game-over="gameLogic.gameOver"
        :winner="gameLogic.winner"
        :current-player="gameLogic.currentPlayer"
        :move-count="gameLogic.moveHistory.length"
        :show-hint="showHint"
        :hint-position="hintPosition"
        @start="startGame"
        @restart="restartGame"
        @analyze="analyzeGame"
        @close-hint="closeHint"
      />
    </div>

    <GomokuControls
      :game-started="gameStarted"
      :game-over="gameLogic.gameOver"
      :current-player="gameLogic.currentPlayer"
      :can-undo="canUndo"
      @start="startGame"
      @restart="restartGame"
      @undo="undoMove"
      @hint="showHintForPlayer"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, nextTick } from 'vue';
  import GomokuHeader from './GomokuHeader.vue';
  import GomokuBoard from './GomokuBoard.vue';
  import GomokuControls from './GomokuControls.vue';
  import GomokuOverlays from './GomokuOverlays.vue';
  import { GomokuLogic } from './GomokuLogic.js';
  import { GomokuAI } from './GomokuAI.js';

  // 游戏状态
  const gameLogic = ref(new GomokuLogic());
  const ai = ref(new GomokuAI(gameLogic.value));
  const gameStarted = ref(false);
  const lastMove = ref(null);
  const showHint = ref(false);
  const hintPosition = ref(null);

  // 统计数据
  const playerWins = ref(
    parseInt(localStorage.getItem('gomoku_player_wins') || '0')
  );
  const totalGames = ref(
    parseInt(localStorage.getItem('gomoku_total_games') || '0')
  );

  // 计算属性
  const canUndo = computed(() => {
    return gameLogic.value.moveHistory.length >= 2 && !gameLogic.value.gameOver;
  });

  const gomokuBoard = ref(null);

  // 开始游戏
  function startGame() {
    gameStarted.value = true;
    gameLogic.value.resetGame();
    ai.value = new GomokuAI(gameLogic.value);
    lastMove.value = null;
    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });
  }

  // 重新开始
  function restartGame() {
    gameLogic.value.resetGame();
    ai.value = new GomokuAI(gameLogic.value);
    lastMove.value = null;
    showHint.value = false;
    hintPosition.value = null;

    if (!gameStarted.value) {
      gameStarted.value = true;
    }

    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });
  }

  // 处理玩家移动
  async function handlePlayerMove(row, col) {
    if (gameLogic.value.gameOver || gameLogic.value.currentPlayer !== 1) {
      return;
    }

    // 玩家下棋
    if (gameLogic.value.makeMove(row, col)) {
      lastMove.value = { row, col };

      // 检查游戏是否结束
      if (gameLogic.value.gameOver) {
        handleGameEnd();
        return;
      }

      // AI回合
      await nextTick();
      setTimeout(async () => {
        await handleAIMove();
      }, 500); // 给AI一点思考时间的视觉效果
    }
  }

  // 处理AI移动
  async function handleAIMove() {
    if (gameLogic.value.gameOver || gameLogic.value.currentPlayer !== 2) {
      return;
    }

    const aiMove = ai.value.getBestMove();
    if (aiMove && gameLogic.value.makeMove(aiMove.row, aiMove.col)) {
      lastMove.value = aiMove;

      if (gameLogic.value.gameOver) {
        handleGameEnd();
      }
    }
  }

  // 悔棋
  function undoMove() {
    if (!canUndo.value) return;

    // 撤销AI的移动
    if (gameLogic.value.undoMove()) {
      // 撤销玩家的移动
      if (gameLogic.value.undoMove()) {
        // 更新最后一步
        const history = gameLogic.value.moveHistory;
        lastMove.value =
          history.length > 0 ? history[history.length - 1] : null;

        nextTick(() => {
          gomokuBoard.value?.drawBoard();
        });
      }
    }
  }

  // 显示提示
  function showHintForPlayer() {
    if (gameLogic.value.gameOver || gameLogic.value.currentPlayer !== 1) {
      return;
    }

    const bestMove = ai.value.getBestMove();
    hintPosition.value = bestMove;
    showHint.value = true;
  }

  // 关闭提示
  function closeHint() {
    showHint.value = false;
    hintPosition.value = null;
  }

  // 游戏结束处理
  function handleGameEnd() {
    totalGames.value++;

    if (gameLogic.value.winner === 1) {
      playerWins.value++;
    }

    // 保存统计数据
    localStorage.setItem('gomoku_player_wins', playerWins.value.toString());
    localStorage.setItem('gomoku_total_games', totalGames.value.toString());
  }

  // 复盘分析
  function analyzeGame() {
    // 这里可以实现复盘功能，暂时只是重新开始
    restartGame();
  }

  onMounted(() => {
    // 初始化游戏
    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });
  });
</script>

<style scoped>
  .gomoku-app {
    display: inline-block;
    vertical-align: top;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
  }

  .game-container {
    position: relative;
    display: flex;
    justify-content: center;
    margin: 20px 0;
  }

  @media (max-width: 768px) {
    .gomoku-app {
      padding: 15px;
      max-width: 95vw;
    }
  }
</style>
