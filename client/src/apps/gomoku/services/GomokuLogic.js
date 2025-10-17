// 五子棋游戏逻辑服务
import {
  BOARD_SIZE,
  CELL_STATES,
  DIRECTIONS,
} from '../constants/gameConstants.js';

export class GomokuLogic {
  constructor() {
    this.BOARD_SIZE = BOARD_SIZE;
    // store actual piece states on the board: 0=empty, 1=black, 2=white
    this.EMPTY = CELL_STATES.EMPTY;
    // map logical "player" (player number 1) to black, and "AI" (player number 2) to white
    this.PLAYER = CELL_STATES.BLACK;
    this.AI = CELL_STATES.WHITE;
    this.board = this.createEmptyBoard();
    this.currentPlayer = this.PLAYER;
    this.gameOver = false;
    this.winner = null;
    this.moveHistory = [];
  }

  createEmptyBoard() {
    return Array(this.BOARD_SIZE)
      .fill()
      .map(() => Array(this.BOARD_SIZE).fill(this.EMPTY));
  }

  resetGame() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = this.PLAYER;
    this.gameOver = false;
    this.winner = null;
    this.moveHistory = [];
  }

  isValidMove(row, col) {
    return (
      row >= 0 &&
      row < this.BOARD_SIZE &&
      col >= 0 &&
      col < this.BOARD_SIZE &&
      this.board[row][col] === this.EMPTY
    );
  }

  makeMove(row, col, player = null) {
    if (!this.isValidMove(row, col) || this.gameOver) {
      return false;
    }

    const currentPlayer = player || this.currentPlayer;
    // sanity check: currentPlayer should be one of CELL_STATES values
    if (currentPlayer !== this.PLAYER && currentPlayer !== this.AI) {
      console.warn(
        '[GomokuLogic] makeMove called with unexpected player value:',
        currentPlayer,
        'expected',
        this.PLAYER,
        'or',
        this.AI
      );
    }
    this.board[row][col] = currentPlayer;
    this.moveHistory.push({ row, col, player: currentPlayer });

    if (this.checkWin(row, col, currentPlayer)) {
      this.gameOver = true;
      this.winner = currentPlayer;
    } else if (this.isBoardFull()) {
      this.gameOver = true;
      this.winner = null; // 平局
    } else {
      this.currentPlayer =
        currentPlayer === this.PLAYER ? this.AI : this.PLAYER;
    }

    return true;
  }

  undoMove() {
    if (this.moveHistory.length === 0) return false;

    const lastMove = this.moveHistory.pop();
    this.board[lastMove.row][lastMove.col] = this.EMPTY;
    this.currentPlayer = lastMove.player;
    this.gameOver = false;
    this.winner = null;

    return true;
  }

  checkWin(row, col, player) {
    for (const [dx, dy] of DIRECTIONS) {
      let count = 1;

      // 正方向计数
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (
          newRow >= 0 &&
          newRow < this.BOARD_SIZE &&
          newCol >= 0 &&
          newCol < this.BOARD_SIZE &&
          this.board[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      // 反方向计数
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (
          newRow >= 0 &&
          newRow < this.BOARD_SIZE &&
          newCol >= 0 &&
          newCol < this.BOARD_SIZE &&
          this.board[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        return true;
      }
    }

    return false;
  }

  isBoardFull() {
    return this.board.every(row => row.every(cell => cell !== this.EMPTY));
  }

  getEmptyPositions() {
    const positions = [];
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (this.board[row][col] === this.EMPTY) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }

  getBoardCopy() {
    return this.board.map(row => [...row]);
  }

  setBoardFromCopy(boardCopy) {
    this.board = boardCopy.map(row => [...row]);
  }
}
