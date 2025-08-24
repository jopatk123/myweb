// 五子棋AI算法模块
export class GomokuAI {
  constructor(gameLogic) {
    this.game = gameLogic;
    this.maxDepth = 4; // 最高难度搜索深度
    this.PLAYER = 1;
    this.AI = 2;

    // 评分权重
    this.scores = {
      FIVE: 100000, // 五连
      FOUR: 10000, // 活四
      BLOCKED_FOUR: 1000, // 冲四
      THREE: 1000, // 活三
      BLOCKED_THREE: 100, // 眠三
      TWO: 100, // 活二
      BLOCKED_TWO: 10, // 眠二
      ONE: 10, // 单子
    };
  }

  // 获取AI的最佳移动
  getBestMove() {
    if (this.game.moveHistory.length === 0) {
      // 首步下在中心附近
      return { row: 7, col: 7 };
    }

    const result = this.minimax(this.maxDepth, -Infinity, Infinity, true);
    return result.move;
  }

  // Minimax算法 + Alpha-Beta剪枝
  minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0 || this.game.gameOver) {
      return { score: this.evaluateBoard(), move: null };
    }

    const moves = this.getRelevantMoves();
    let bestMove = null;

    if (isMaximizing) {
      let maxScore = -Infinity;

      for (const move of moves) {
        // 尝试移动
        this.game.makeMove(move.row, move.col, this.AI);

        const result = this.minimax(depth - 1, alpha, beta, false);

        // 撤销移动
        this.game.undoMove();

        if (result.score > maxScore) {
          maxScore = result.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, result.score);
        if (beta <= alpha) {
          break; // Alpha-Beta剪枝
        }
      }

      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;

      for (const move of moves) {
        // 尝试移动
        this.game.makeMove(move.row, move.col, this.PLAYER);

        const result = this.minimax(depth - 1, alpha, beta, true);

        // 撤销移动
        this.game.undoMove();

        if (result.score < minScore) {
          minScore = result.score;
          bestMove = move;
        }

        beta = Math.min(beta, result.score);
        if (beta <= alpha) {
          break; // Alpha-Beta剪枝
        }
      }

      return { score: minScore, move: bestMove };
    }
  }

  // 获取相关的候选移动位置（优化搜索空间）
  getRelevantMoves() {
    const moves = [];
    const board = this.game.board;
    const visited = new Set();

    // 在已有棋子周围2格范围内寻找候选位置
    for (let row = 0; row < this.game.BOARD_SIZE; row++) {
      for (let col = 0; col < this.game.BOARD_SIZE; col++) {
        if (board[row][col] !== this.game.EMPTY) {
          // 在周围2格范围内添加候选位置
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const newRow = row + dr;
              const newCol = col + dc;
              const key = `${newRow},${newCol}`;

              if (
                newRow >= 0 &&
                newRow < this.game.BOARD_SIZE &&
                newCol >= 0 &&
                newCol < this.game.BOARD_SIZE &&
                board[newRow][newCol] === this.game.EMPTY &&
                !visited.has(key)
              ) {
                moves.push({ row: newRow, col: newCol });
                visited.add(key);
              }
            }
          }
        }
      }
    }

    // 如果没有找到候选位置，返回所有空位置
    if (moves.length === 0) {
      return this.game.getEmptyPositions();
    }

    // 按评分排序，优先考虑高分位置
    return moves
      .sort((a, b) => {
        const scoreA = this.evaluatePosition(a.row, a.col, this.AI);
        const scoreB = this.evaluatePosition(b.row, b.col, this.AI);
        return scoreB - scoreA;
      })
      .slice(0, 20); // 限制候选数量以提高性能
  }

  // 评估整个棋盘
  evaluateBoard() {
    let aiScore = 0;
    let playerScore = 0;

    // 评估所有方向的连子情况
    for (let row = 0; row < this.game.BOARD_SIZE; row++) {
      for (let col = 0; col < this.game.BOARD_SIZE; col++) {
        if (this.game.board[row][col] !== this.game.EMPTY) {
          const player = this.game.board[row][col];
          const score = this.evaluatePosition(row, col, player);

          if (player === this.AI) {
            aiScore += score;
          } else {
            playerScore += score;
          }
        }
      }
    }

    return aiScore - playerScore;
  }

  // 评估特定位置的分数
  evaluatePosition(row, col, player) {
    const directions = [
      [0, 1], // 水平
      [1, 0], // 垂直
      [1, 1], // 主对角线
      [1, -1], // 副对角线
    ];

    let totalScore = 0;

    for (const [dx, dy] of directions) {
      const lineScore = this.evaluateLine(row, col, dx, dy, player);
      totalScore += lineScore;
    }

    return totalScore;
  }

  // 评估一条线上的分数
  evaluateLine(row, col, dx, dy, player) {
    let count = 1;
    let blocked = 0;

    // 正方向
    let i = 1;
    while (i < 5) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;

      if (
        newRow < 0 ||
        newRow >= this.game.BOARD_SIZE ||
        newCol < 0 ||
        newCol >= this.game.BOARD_SIZE
      ) {
        blocked++;
        break;
      }

      if (this.game.board[newRow][newCol] === player) {
        count++;
      } else if (this.game.board[newRow][newCol] !== this.game.EMPTY) {
        blocked++;
        break;
      } else {
        break;
      }
      i++;
    }

    // 反方向
    i = 1;
    while (i < 5) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;

      if (
        newRow < 0 ||
        newRow >= this.game.BOARD_SIZE ||
        newCol < 0 ||
        newCol >= this.game.BOARD_SIZE
      ) {
        blocked++;
        break;
      }

      if (this.game.board[newRow][newCol] === player) {
        count++;
      } else if (this.game.board[newRow][newCol] !== this.game.EMPTY) {
        blocked++;
        break;
      } else {
        break;
      }
      i++;
    }

    return this.getScoreByCount(count, blocked);
  }

  // 根据连子数和阻挡情况获取分数
  getScoreByCount(count, blocked) {
    if (blocked === 2) return 0; // 两端都被堵

    switch (count) {
      case 5:
        return this.scores.FIVE;
      case 4:
        return blocked === 1 ? this.scores.BLOCKED_FOUR : this.scores.FOUR;
      case 3:
        return blocked === 1 ? this.scores.BLOCKED_THREE : this.scores.THREE;
      case 2:
        return blocked === 1 ? this.scores.BLOCKED_TWO : this.scores.TWO;
      case 1:
        return this.scores.ONE;
      default:
        return 0;
    }
  }
}
