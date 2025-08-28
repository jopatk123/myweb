// 五子棋AI算法模块
export class GomokuAI {
  constructor(gameLogic) {
    this.game = gameLogic;
    this.maxDepth = 4; // 默认搜索深度，可以根据难度动态调整
    this.PLAYER = 1;
    this.AI = 2;

    // 优化后的评分权重，更能体现棋型威胁
    this.scores = {
      FIVE: 100000, // 连五
      FOUR: 10000, // 活四
      BLOCKED_FOUR: 5000, // 冲四
      THREE: 2000, // 活三
      BLOCKED_THREE: 500, // 眠三
      TWO: 200, // 活二
      BLOCKED_TWO: 50, // 眠二
      ONE: 10, // 活一
    };
  }

  // 获取AI的最佳移动
  getBestMove() {
    if (this.game.moveHistory.length === 0) {
      return {
        row: Math.floor(this.game.BOARD_SIZE / 2),
        col: Math.floor(this.game.BOARD_SIZE / 2),
      };
    }

    // 记录开始时间
    const startTime = performance.now();

    const result = this.minimax(this.maxDepth, -Infinity, Infinity, true);

    // 记录结束时间
    const endTime = performance.now();


    return result.move;
  }

  // Minimax算法 + Alpha-Beta剪枝
  minimax(depth, alpha, beta, isMaximizing) {
    // 检查是否有胜利方
    const winner = this.checkTerminalState();
    if (winner === this.AI) return { score: this.scores.FIVE, move: null };
    if (winner === this.PLAYER) return { score: -this.scores.FIVE, move: null };
    if (depth === 0) {
      return { score: this.evaluateBoard(), move: null };
    }

    const moves = this.getRelevantMoves();
    if (moves.length === 0) {
      return { score: 0, move: null };
    }

    let bestMove = null;

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        this.game.makeMove(move.row, move.col, this.AI);
        const result = this.minimax(depth - 1, alpha, beta, false);
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
        this.game.makeMove(move.row, move.col, this.PLAYER);
        const result = this.minimax(depth - 1, alpha, beta, true);
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

  // 检查终端状态（是否有玩家胜利）
  checkTerminalState() {
    const lastMove = this.game.moveHistory[this.game.moveHistory.length - 1];
    if (!lastMove) return null;
    if (this.game.checkWin(lastMove.row, lastMove.col, lastMove.player)) {
      return lastMove.player;
    }
    return null;
  }

  // 获取相关的候选移动位置
  getRelevantMoves() {
    const moves = new Set();
    const board = this.game.board;
    const size = this.game.BOARD_SIZE;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === this.game.EMPTY) {
          // 检查周围是否有棋子
          if (this.hasNeighbor(r, c, 2)) {
            moves.add(`${r},${c}`);
          }
        }
      }
    }

    const relevantMoves = Array.from(moves).map(m => {
      const [row, col] = m.split(',').map(Number);
      return { row, col };
    });

    if (relevantMoves.length === 0) {
      return this.game.getEmptyPositions();
    }

    // 对候选位置进行排序，优先考虑能形成高分棋型的位置
    relevantMoves.sort((a, b) => {
      const scoreA = this.evaluatePosition(a.row, a.col);
      const scoreB = this.evaluatePosition(b.row, b.col);
      return scoreB - scoreA;
    });

    return relevantMoves.slice(0, 20); // 限制候选数量以提高性能
  }

  hasNeighbor(row, col, distance) {
    const board = this.game.board;
    const size = this.game.BOARD_SIZE;
    for (let i = -distance; i <= distance; i++) {
      for (let j = -distance; j <= distance; j++) {
        if (i === 0 && j === 0) continue;
        const newRow = row + i;
        const newCol = col + j;
        if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
          if (board[newRow][newCol] !== this.game.EMPTY) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 评估一个特定落子点的潜在价值
  evaluatePosition(row, col) {
    const board = this.game.board;
    let score = 0;

    // 模拟AI落子
    board[row][col] = this.AI;
    score += this.evaluateLinePatterns(row, col, this.AI);

    // 模拟玩家落子
    board[row][col] = this.PLAYER;
    score += this.evaluateLinePatterns(row, col, this.PLAYER);

    // 恢复棋盘
    board[row][col] = this.game.EMPTY;

    return score;
  }

  // 评估整个棋盘
  evaluateBoard() {
    let aiScore = 0;
    let playerScore = 0;
    const board = this.game.board;
    const size = this.game.BOARD_SIZE;

    // 评估所有行、列和对角线
    for (let i = 0; i < size; i++) {
      // 评估行
      const rowLine = board[i];
      aiScore += this.evaluateLineScore(rowLine, this.AI);
      playerScore += this.evaluateLineScore(rowLine, this.PLAYER);

      // 评估列
      const colLine = [];
      for (let j = 0; j < size; j++) {
        colLine.push(board[j][i]);
      }
      aiScore += this.evaluateLineScore(colLine, this.AI);
      playerScore += this.evaluateLineScore(colLine, this.PLAYER);
    }

    // 评估对角线
    for (let k = 0; k < size * 2 - 1; k++) {
      const diag1 = [];
      const diag2 = [];
      for (let i = 0; i < size; i++) {
        // 主对角线
        if (k - i >= 0 && k - i < size) {
          diag1.push(board[i][k - i]);
        }
        // 副对角线
        if (k - (size - 1 - i) >= 0 && k - (size - 1 - i) < size) {
          diag2.push(board[i][k - (size - 1 - i)]);
        }
      }
      if (diag1.length >= 5) {
        aiScore += this.evaluateLineScore(diag1, this.AI);
        playerScore += this.evaluateLineScore(diag1, this.PLAYER);
      }
      if (diag2.length >= 5) {
        aiScore += this.evaluateLineScore(diag2, this.AI);
        playerScore += this.evaluateLineScore(diag2, this.PLAYER);
      }
    }

    return aiScore - playerScore;
  }

  // 评估单条线上的所有棋型分数
  evaluateLineScore(line, player) {
    let score = 0;
    const opponent = player === this.PLAYER ? this.AI : this.PLAYER;
    const lineStr = line.join('');

    // 匹配五连
    if (lineStr.includes(String(player).repeat(5))) {
      score += this.scores.FIVE;
    }

    // 匹配活四: 011110
    const liveFourRegex = new RegExp(`0${String(player).repeat(4)}0`, 'g');
    if (liveFourRegex.test(lineStr)) {
      score += this.scores.FOUR;
    }

    // 匹配冲四: 211110 or 011112 or 10111 or 11011
    const blockedFourRegex1 = new RegExp(
      `${opponent}${String(player).repeat(4)}0|0${String(player).repeat(4)}${opponent}`,
      'g'
    );
    const blockedFourRegex2 = new RegExp(
      `${player}0${String(player).repeat(3)}|${String(player).repeat(2)}0${String(player).repeat(2)}|${String(player).repeat(3)}0${player}`,
      'g'
    );
    if (blockedFourRegex1.test(lineStr) || blockedFourRegex2.test(lineStr)) {
      score += this.scores.BLOCKED_FOUR;
    }

    // 匹配活三: 01110
    const liveThreeRegex = new RegExp(`0${String(player).repeat(3)}0`, 'g');
    if (liveThreeRegex.test(lineStr)) {
      score += this.scores.THREE;
    }

    // 匹配眠三: 21110 or 01112 or 10110
    const blockedThreeRegex = new RegExp(
      `${opponent}${String(player).repeat(3)}0|0${String(player).repeat(3)}${opponent}|${player}0${player}${player}0|0${player}${player}0${player}`,
      'g'
    );
    if (blockedThreeRegex.test(lineStr)) {
      score += this.scores.BLOCKED_THREE;
    }

    // 匹配活二: 001100
    const liveTwoRegex = new RegExp(`00${String(player).repeat(2)}00`, 'g');
    if (liveTwoRegex.test(lineStr)) {
      score += this.scores.TWO;
    }

    // 匹配眠二: 2110 or 0112
    const blockedTwoRegex = new RegExp(
      `${opponent}${String(player).repeat(2)}0|0${String(player).repeat(2)}${opponent}`,
      'g'
    );
    if (blockedTwoRegex.test(lineStr)) {
      score += this.scores.BLOCKED_TWO;
    }

    return score;
  }

  // 评估一个点在四个方向上能形成的棋型分数
  evaluateLinePatterns(row, col, player) {
    let score = 0;
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dr, dc] of directions) {
      let line = [player];
      // 正反两个方向扩展
      for (let i = 1; i < 5; i++)
        line.unshift(this.getBoardPiece(row - i * dr, col - i * dc));
      for (let i = 1; i < 5; i++)
        line.push(this.getBoardPiece(row + i * dr, col + i * dc));
      score += this.evaluateLineScore(line, player);
    }
    return score;
  }

  getBoardPiece(row, col) {
    if (
      row < 0 ||
      row >= this.game.BOARD_SIZE ||
      col < 0 ||
      col >= this.game.BOARD_SIZE
    ) {
      return -1; // -1 表示边界外
    }
    return this.game.board[row][col];
  }
}
