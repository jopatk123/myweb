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

// 方向向量（用于搜索连子方向）
export const DIRECTIONS = [
  [0, 1], // 水平
  [1, 0], // 垂直
  [1, 1], // 主对角线
  [1, -1], // 副对角线
];

// 玩家类型（用于游戏逻辑，数字用于在棋盘上表示）

// 注意：下面的 PLAYER_ROLES/PLAYER_TYPES 描述的是“玩家角色/类型”，
// 与棋盘上格子的颜色值（CELL_STATES）是不同的语义。
// 为保持向后兼容，导出 PLAYER_TYPES 作为别名，但更推荐使用 PLAYER_ROLES。
export const PLAYER_ROLES = {
  HUMAN: 'human',
  AI_MODEL: 'ai_model'
};

// backward-compatible alias (legacy code may import PLAYER_TYPES)
export const PLAYER_TYPES = PLAYER_ROLES;