// 五子棋游戏常量
export const BOARD_SIZE = 15;

export const CELL_STATES = {
  EMPTY: 0,
  BLACK: 1,
  WHITE: 2
};

export const PLAYER_NAMES = {
  [CELL_STATES.BLACK]: '黑子',
  [CELL_STATES.WHITE]: '白子'
};

export const GAME_STATES = {
  NOT_STARTED: 'not_started',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

export const WIN_CONDITIONS = {
  CONSECUTIVE_COUNT: 5
};

export const AI_THINKING_DELAY = 1000; // AI思考延迟时间(毫秒)

// 玩家类型（用于游戏逻辑，数字用于在棋盘上表示）
export const PLAYER_TYPES = {
  EMPTY: 0,
  PLAYER: 1,
  AI: 2
};

// 方向向量（用于搜索连子方向）
export const DIRECTIONS = [
  [0, 1], // 水平
  [1, 0], // 垂直
  [1, 1], // 主对角线
  [1, -1] // 副对角线
];