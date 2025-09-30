// 多人游戏通用常量
export const GAME_MODES = {
  SHARED: 'shared',
  COMPETITIVE: 'competitive',
  COOPERATIVE: 'cooperative',
  BATTLE_ROYALE: 'battle_royale',
  TEAM: 'team',
};

export const GAME_STATUS = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished',
};

export const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

export const PLAYER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  READY: 'ready',
  NOT_READY: 'not_ready',
  PLAYING: 'playing',
  SPECTATING: 'spectating',
};

export const DEFAULT_PLAYER_COUNTS = [2, 4, 6, 8];
