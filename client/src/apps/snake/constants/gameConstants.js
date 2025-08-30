/**
 * 贪吃蛇游戏常量配置
 * 集中管理所有游戏相关的常量
 */

// 游戏配置
export const GAME_CONFIG = {
  // 画布配置
  BOARD_SIZE: 400,
  CELL_SIZE: 20,
  
  // 游戏速度配置
  SPEEDS: {
    easy: 150,
    medium: 120,
    hard: 90,
    extreme: 60,
  },
  
  // 游戏机制配置
  SPECIAL_FOOD_PROBABILITY: 0.1,
  SPECIAL_FOOD_TIMEOUT: 5000,
  PARTICLE_DECAY_RATE: 0.02,
  MIN_SPEED: 30,
  SPEED_INCREASE_PER_LEVEL: 5,
  SCORE_PER_FOOD: 10,
  SCORE_PER_SPECIAL_FOOD: 50,
  LEVEL_UP_SCORE: 100,
};

// 初始游戏状态
export const INITIAL_GAME_STATE = {
  SNAKE: [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ],
  DIRECTION: { x: 1, y: 0 },
  FOOD: { x: 15, y: 15 },
  SCORE: 0,
  LEVEL: 1,
};

// 方向常量
export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// 方向映射
export const DIRECTION_MAP = {
  up: DIRECTIONS.UP,
  down: DIRECTIONS.DOWN,
  left: DIRECTIONS.LEFT,
  right: DIRECTIONS.RIGHT,
};

// 键盘映射
export const KEY_MAP = {
  ArrowUp: DIRECTIONS.UP,
  ArrowDown: DIRECTIONS.DOWN,
  ArrowLeft: DIRECTIONS.LEFT,
  ArrowRight: DIRECTIONS.RIGHT,
  w: DIRECTIONS.UP,
  W: DIRECTIONS.UP,
  s: DIRECTIONS.DOWN,
  S: DIRECTIONS.DOWN,
  a: DIRECTIONS.LEFT,
  A: DIRECTIONS.LEFT,
  d: DIRECTIONS.RIGHT,
  D: DIRECTIONS.RIGHT,
};

// 颜色配置
export const COLORS = {
  // 蛇的颜色
  SNAKE: {
    DEFAULT: '#4ade80',
    HIGHLIGHT: '#ffffff',
    HEAD_EYES: '#000000',
  },
  
  // 食物颜色
  FOOD: {
    PALETTES: [
      ['#ff6b6b', '#ff4757'],
      ['#7c3aed', '#6d28d9'],
      ['#0ea5e9', '#0284c7'],
      ['#f59e0b', '#d97706'],
    ],
    SPECIAL: '#ffd700',
  },
  
  // 多人模式颜色
  MULTIPLAYER: {
    PLAYER_COLORS: ['#4ade80', '#60a5fa', '#f472b6', '#facc15'],
  },
  
  // 背景和网格
  BACKGROUND: '#1a1a1a',
  GRID: '#2a2a2a',
  
  // 粒子效果
  PARTICLES: {
    FOOD: '#ff6b6b',
    SPECIAL_FOOD: '#ffd700',
    LEVEL_UP: '#4ade80',
    COLLISION: '#ff4757',
  },
};

// 游戏状态
export const GAME_STATUS = {
  MENU: 'menu',
  SINGLE: 'single',
  MULTIPLAYER: 'multiplayer',
  LOBBY: 'lobby',
  ROOM: 'room',
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

// 多人游戏模式
export const MULTIPLAYER_MODES = {
  SHARED: 'shared',
  COMPETITIVE: 'competitive',
};

// 本地存储键名
export const STORAGE_KEYS = {
  HIGH_SCORE: 'snakeHighScore',
  CURRENT_ROOM_CODE: 'snakeCurrentRoomCode',
  PLAYER_SETTINGS: 'snakePlayerSettings',
};

// 网络配置
export const NETWORK_CONFIG = {
  WEBSOCKET_TIMEOUT: 8000,
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 1000,
};

// 游戏事件类型
export const GAME_EVENTS = {
  // 单人游戏事件
  GAME_START: 'game_start',
  GAME_PAUSE: 'game_pause',
  GAME_RESTART: 'game_restart',
  GAME_OVER: 'game_over',
  SCORE_UPDATE: 'score_update',
  LEVEL_UP: 'level_up',
  
  // 多人游戏事件
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  PLAYER_READY: 'player_ready',
  VOTE_CAST: 'vote_cast',
  GAME_UPDATE: 'game_update',
};

// 错误消息
export const ERROR_MESSAGES = {
  ROOM_NOT_FOUND: '房间不存在',
  ROOM_FULL: '房间已满',
  INVALID_ROOM_CODE: '无效的房间码',
  CONNECTION_FAILED: '连接失败',
  GAME_ALREADY_STARTED: '游戏已开始',
  NOT_ENOUGH_PLAYERS: '玩家数量不足',
  PERMISSION_DENIED: '权限不足',
};

// 成功消息
export const SUCCESS_MESSAGES = {
  ROOM_CREATED: '房间创建成功',
  ROOM_JOINED: '加入房间成功',
  GAME_STARTED: '游戏开始',
  PLAYER_READY: '准备就绪',
};