// 五子棋 AI 相关常量
export const BOARD_SIZE = 15;
export const DEFAULT_TEMPLATE_ID = 'gomoku-system';
export const FALLBACK_TEMPLATE_ID = 'gomoku-advanced';

// （威胁优先级常量已移除，改由大模型自行评估局面）

export function isValidCoordinate(row, col, size = BOARD_SIZE) {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < size &&
    col >= 0 &&
    col < size
  );
}
