// 五子棋 AI 相关常量
export const BOARD_SIZE = 15;
export const DEFAULT_TEMPLATE_ID = 'gomoku-system';
export const FALLBACK_TEMPLATE_ID = 'gomoku-advanced';

// 威胁优先级（数值越大优先级越高）
export const THREAT_PRIORITIES = Object.freeze({
  '五连': 10,
  '活四': 9,
  '冲四': 8,
  '跳四': 7,
  '活三': 6,
  '冲三': 5,
  '活跳三': 4,
  '冲跳三': 3,
  '跳三': 3,
  '死跳三': 2,
  '活二': 1,
  '跳二': 1
});

export function isValidCoordinate(row, col, size = BOARD_SIZE) {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < size && col >= 0 && col < size;
}
