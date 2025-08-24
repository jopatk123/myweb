<template>
  <div class="gomoku-board-container">
    <canvas
      ref="boardCanvas"
      :width="canvasSize"
      :height="canvasSize"
      class="gomoku-board"
      @click="handleClick"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    ></canvas>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, nextTick } from 'vue';

  const props = defineProps({
    board: {
      type: Array,
      required: true,
    },
    currentPlayer: {
      type: Number,
      required: true,
    },
    gameOver: {
      type: Boolean,
      default: false,
    },
    lastMove: {
      type: Object,
      default: null,
    },
  });

  const emit = defineEmits(['move']);

  const boardCanvas = ref(null);
  const canvasSize = 480;
  const boardSize = 15;
  const cellSize = canvasSize / (boardSize + 1);
  const stoneRadius = cellSize * 0.4;
  const hoverPosition = ref(null);

  let ctx = null;

  onMounted(() => {
    ctx = boardCanvas.value.getContext('2d');
    drawBoard();
  });

  watch(
    () => props.board,
    () => {
      nextTick(() => {
        drawBoard();
      });
    },
    { deep: true }
  );

  watch(
    () => props.lastMove,
    () => {
      nextTick(() => {
        drawBoard();
      });
    }
  );

  function drawBoard() {
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // 绘制背景
    const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
    gradient.addColorStop(0, '#d4a574');
    gradient.addColorStop(1, '#c19660');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 绘制网格线
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1;

    for (let i = 1; i <= boardSize; i++) {
      const pos = i * cellSize;

      // 垂直线
      ctx.beginPath();
      ctx.moveTo(pos, cellSize);
      ctx.lineTo(pos, canvasSize - cellSize);
      ctx.stroke();

      // 水平线
      ctx.beginPath();
      ctx.moveTo(cellSize, pos);
      ctx.lineTo(canvasSize - cellSize, pos);
      ctx.stroke();
    }

    // 绘制天元和星位
    const starPoints = [
      [4, 4],
      [4, 12],
      [12, 4],
      [12, 12],
      [8, 8],
    ];

    ctx.fillStyle = '#8b6914';
    starPoints.forEach(([row, col]) => {
      const x = (col + 1) * cellSize;
      const y = (row + 1) * cellSize;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 绘制棋子
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (props.board[row][col] !== 0) {
          drawStone(row, col, props.board[row][col]);
        }
      }
    }

    // 绘制最后一步标记
    if (props.lastMove) {
      drawLastMoveMarker(props.lastMove.row, props.lastMove.col);
    }

    // 绘制悬停提示
    if (hoverPosition.value && !props.gameOver && props.currentPlayer === 1) {
      drawHoverStone(hoverPosition.value.row, hoverPosition.value.col);
    }
  }

  function drawStone(row, col, player) {
    const x = (col + 1) * cellSize;
    const y = (row + 1) * cellSize;

    // 绘制阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, stoneRadius, 0, 2 * Math.PI);
    ctx.fill();

    // 绘制棋子
    if (player === 1) {
      // 玩家棋子 - 黑色
      const gradient = ctx.createRadialGradient(
        x - 5,
        y - 5,
        0,
        x,
        y,
        stoneRadius
      );
      gradient.addColorStop(0, '#4a4a4a');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
    } else {
      // AI棋子 - 白色
      const gradient = ctx.createRadialGradient(
        x - 5,
        y - 5,
        0,
        x,
        y,
        stoneRadius
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#e0e0e0');
      ctx.fillStyle = gradient;
    }

    ctx.beginPath();
    ctx.arc(x, y, stoneRadius, 0, 2 * Math.PI);
    ctx.fill();

    // 绘制棋子边框
    ctx.strokeStyle = player === 1 ? '#666' : '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawLastMoveMarker(row, col) {
    const x = (col + 1) * cellSize;
    const y = (row + 1) * cellSize;

    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, stoneRadius + 5, 0, 2 * Math.PI);
    ctx.stroke();
  }

  function drawHoverStone(row, col) {
    const x = (col + 1) * cellSize;
    const y = (row + 1) * cellSize;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, stoneRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  function getPositionFromEvent(event) {
    const rect = boardCanvas.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.round(x / cellSize) - 1;
    const row = Math.round(y / cellSize) - 1;

    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      return { row, col };
    }
    return null;
  }

  function handleClick(event) {
    if (props.gameOver || props.currentPlayer !== 1) return;

    const position = getPositionFromEvent(event);
    if (position && props.board[position.row][position.col] === 0) {
      emit('move', position.row, position.col);
    }
  }

  function handleMouseMove(event) {
    if (props.gameOver || props.currentPlayer !== 1) return;

    const position = getPositionFromEvent(event);
    if (position && props.board[position.row][position.col] === 0) {
      hoverPosition.value = position;
    } else {
      hoverPosition.value = null;
    }
    drawBoard();
  }

  function handleMouseLeave() {
    hoverPosition.value = null;
    drawBoard();
  }

  defineExpose({
    drawBoard,
  });
</script>

<style scoped>
  .gomoku-board-container {
    display: flex;
    justify-content: center;
    margin: 20px 0;
  }

  .gomoku-board {
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .gomoku-board:hover {
    transform: scale(1.01);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  }

  .gomoku-board.game-over {
    cursor: default;
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    .gomoku-board {
      width: 90vw;
      height: 90vw;
      max-width: 400px;
      max-height: 400px;
    }
  }
</style>
