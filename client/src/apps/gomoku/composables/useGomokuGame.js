// 五子棋游戏状态管理组合式函数
import { ref, computed } from 'vue';
import { GomokuLogic } from '../services/GomokuLogic.js';

export function useGomokuGame() {
  // 游戏核心状态
  const gameLogic = ref(new GomokuLogic());
  const gameStarted = ref(false);
  const lastMove = ref(null);

  // 计算属性
  const canUndo = computed(() => {
    return gameLogic.value.moveHistory.length >= 2 && !gameLogic.value.gameOver;
  });

  const currentPlayer = computed(() => gameLogic.value.currentPlayer);
  const gameOver = computed(() => gameLogic.value.gameOver);
  const winner = computed(() => gameLogic.value.winner);
  const board = computed(() => gameLogic.value.board);
  const moveCount = computed(() => gameLogic.value.moveHistory.length);
  const gameHistory = computed(() => gameLogic.value.moveHistory);

  // 游戏控制方法
  function startGame() {
    gameStarted.value = true;
    gameLogic.value.resetGame();
    lastMove.value = null;
  }

  function restartGame() {
    gameLogic.value.resetGame();
    lastMove.value = null;
    
    if (!gameStarted.value) {
      gameStarted.value = true;
    }
  }

  function makePlayerMove(row, col) {
    console.log('[DEBUG makePlayerMove] Called with:', row, col, 'currentPlayer:', gameLogic.value.currentPlayer, 'gameOver:', gameLogic.value.gameOver);
    
    if (gameLogic.value.gameOver) {
      console.log('[DEBUG makePlayerMove] Game is over, move rejected');
      return false;
    }

    // 移除玩家限制检查，允许AI调用此函数
    console.log('[DEBUG makePlayerMove] Attempting to make move');
    if (gameLogic.value.makeMove(row, col)) {
      console.log('[DEBUG makePlayerMove] Move successful! New current player:', gameLogic.value.currentPlayer);
      lastMove.value = { row, col };
      return true;
    }
    console.log('[DEBUG makePlayerMove] Move failed - position may be occupied or invalid');
    return false;
  }

  // 简化的AI移动（用于演示）
  function makeAIMove() {
    // 这个函数现在只是一个占位符
    // 实际的AI逻辑在主组件中处理
    return null;
  }

  function undoMove() {
    if (!canUndo.value) return false;

    // 撤销AI的移动
    if (gameLogic.value.undoMove()) {
      // 撤销玩家的移动
      if (gameLogic.value.undoMove()) {
        // 更新最后一步
        const history = gameLogic.value.moveHistory;
        lastMove.value = history.length > 0 ? history[history.length - 1] : null;
        return true;
      }
    }
    return false;
  }

  // 简化的提示功能
  function getHint() {
    if (gameLogic.value.gameOver) {
      return null;
    }
    
    // 简单提示：建议中心位置或附近
    const center = Math.floor(gameLogic.value.BOARD_SIZE / 2);
    for (let offset = 0; offset < 3; offset++) {
      for (let dr = -offset; dr <= offset; dr++) {
        for (let dc = -offset; dc <= offset; dc++) {
          const row = center + dr;
          const col = center + dc;
          if (gameLogic.value.isValidMove(row, col)) {
            return { row, col };
          }
        }
      }
    }
    
    return null;
  }

  return {
    // 状态
    gameStarted,
    lastMove,
    
    // 计算属性
    canUndo,
    currentPlayer,
    gameOver,
    winner,
    board,
    moveCount,
  gameHistory,
    
    // 方法
    startGame,
    restartGame,
    makePlayerMove,
    makeAIMove,
    undoMove,
    getHint
  };
}