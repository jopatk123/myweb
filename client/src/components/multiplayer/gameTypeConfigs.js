// 游戏类型与模式配置
export const GAME_TYPE_CONFIGS = {
  snake: {
    name: '贪吃蛇',
    icon: '🐍',
    minPlayers: 1,
    maxPlayers: 8,
    defaultModes: ['shared', 'competitive'],
    supportedFeatures: ['voting', 'spectating', 'chat'],
  },
  gomoku: {
    name: '五子棋',
    icon: '⚫',
    minPlayers: 2,
    maxPlayers: 2,
    defaultModes: ['competitive'],
    supportedFeatures: ['spectating', 'chat', 'undo'],
  },
  chess: {
    name: '象棋',
    icon: '♟️',
    minPlayers: 2,
    maxPlayers: 2,
    defaultModes: ['competitive'],
    supportedFeatures: ['spectating', 'chat', 'undo', 'timer'],
  },
  tank: {
    name: '坦克大战',
    icon: '🚗',
    minPlayers: 1,
    maxPlayers: 4,
    defaultModes: ['battle_royale', 'team'],
    supportedFeatures: ['power_ups', 'destructible_terrain'],
  },
};

export const DEFAULT_GAME_MODES = [
  {
    value: 'shared',
    icon: '🤝',
    label: '共享模式',
    description: '多人协作控制',
  },
  {
    value: 'competitive',
    icon: '⚔️',
    label: '竞技模式',
    description: '玩家对战',
  },
  {
    value: 'cooperative',
    icon: '🤝',
    label: '合作模式',
    description: '团队协作',
  },
  {
    value: 'battle_royale',
    icon: '👑',
    label: '大逃杀',
    description: '最后生存者',
  },
  {
    value: 'team',
    icon: '👥',
    label: '团队模式',
    description: '团队对战',
  },
];
