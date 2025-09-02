// 棋盘与历史记录格式化
// 不需要外部校验函数，移除未使用的导入以避免 ESLint 警告

export function boardToString(board) {
  if (!board || !Array.isArray(board) || !Array.isArray(board[0])) return '无效棋盘数据';
  const size = board.length;
  let result = '   ';
  for (let i = 0; i < size; i++) {
    result += i.toString().padStart(2, ' ') + ' ';
  }
  result += '\n';
  for (let i = 0; i < size; i++) {
    result += i.toString().padStart(2, ' ') + ' ';
    for (let j = 0; j < size; j++) {
      const cell = board[i][j];
      if (cell === 0) result += ' · ';
      else if (cell === 1) result += ' ● ';
      else if (cell === 2) result += ' ○ ';
      else result += board[i][j].toString().padStart(2, ' ') + ' ';
    }
    result += '\n';
  }
  return result;
}

export function historyToString(gameHistory) {
  if (!gameHistory || gameHistory.length === 0) return '暂无走棋记录';
  return gameHistory.map((move, idx) => `第${idx + 1}步: ${move.player === 1 ? '黑子' : '白子'} 下在 (${move.row}, ${move.col})`).join('\n');
}

// 组合完整棋局字符串的工具（可独立使用）
export function buildBoardSection(board, gameHistory) {
  return `棋盘（0=空位，1=黑子，2=白子）：\n${boardToString(board)}\n历史走棋记录：\n${historyToString(gameHistory)}`;
}
