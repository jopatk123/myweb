import { GAME_TYPE_CONFIGS, DEFAULT_GAME_MODES } from './gameTypeConfigs.js';

const fallbackGameConfig = gameType => ({
  name: gameType,
  icon: '🎮',
  minPlayers: 1,
  maxPlayers: 8,
  defaultModes: ['competitive'],
  supportedFeatures: [],
});

const colorSchemes = {
  default: [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#FFD93D',
    '#FF8C69',
    '#87CEEB',
    '#DEB887',
    '#F0E68C',
  ],
  vibrant: [
    '#FF5722',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
  ],
  pastel: [
    '#FFB3BA',
    '#FFDFBA',
    '#FFFFBA',
    '#BAFFC9',
    '#BAE1FF',
    '#C9B3FF',
    '#FFBAF3',
    '#B3FFBA',
    '#FFC9B3',
    '#B3C9FF',
    '#F3B3FF',
    '#B3FFF3',
  ],
};

export const gameUtils = {
  getGameConfig: gameType => {
    return GAME_TYPE_CONFIGS[gameType] || fallbackGameConfig(gameType);
  },

  getModeConfig: (modes = DEFAULT_GAME_MODES) => {
    return modes.reduce((acc, mode) => {
      acc[mode.value] = mode;
      return acc;
    }, {});
  },

  getAvailableModes: (gameType, allModes = DEFAULT_GAME_MODES) => {
    const config = gameUtils.getGameConfig(gameType);
    return allModes.filter(mode => config.defaultModes.includes(mode.value));
  },

  generatePlayerColor: (playerId, colorScheme = 'default') => {
    const colors = colorSchemes[colorScheme] || colorSchemes.default;
    const index = playerId
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  },

  formatRoomCode: code => {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  },

  validateRoomCode: code => {
    const formatted = gameUtils.formatRoomCode(code);
    return {
      isValid: formatted.length >= 4 && formatted.length <= 10,
      formatted,
      message:
        formatted.length === 0
          ? '请输入房间码'
          : formatted.length < 4
            ? '房间码至少4位'
            : formatted.length > 10
              ? '房间码最多10位'
              : '',
    };
  },

  validatePlayerName: (name, options = {}) => {
    const {
      minLength = 1,
      maxLength = 20,
      allowEmoji = true,
      forbiddenWords = [],
    } = options;

    const trimmed = name.trim();

    if (trimmed.length < minLength) {
      return {
        isValid: false,
        message: `昵称至少${minLength}个字符`,
      };
    }

    if (trimmed.length > maxLength) {
      return {
        isValid: false,
        message: `昵称最多${maxLength}个字符`,
      };
    }

    if (
      !allowEmoji &&
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu.test(
        trimmed
      )
    ) {
      return {
        isValid: false,
        message: '昵称不能包含表情符号',
      };
    }

    const hasForbiddenWord = forbiddenWords.some(word =>
      trimmed.toLowerCase().includes(word.toLowerCase())
    );

    if (hasForbiddenWord) {
      return {
        isValid: false,
        message: '昵称包含敏感词汇',
      };
    }

    return {
      isValid: true,
      message: '',
      formatted: trimmed,
    };
  },

  getStatusText: (status, language = 'zh') => {
    const statusMaps = {
      zh: {
        waiting: '等待中',
        starting: '准备开始',
        playing: '游戏中',
        paused: '已暂停',
        finished: '已结束',
      },
      en: {
        waiting: 'Waiting',
        starting: 'Starting',
        playing: 'Playing',
        paused: 'Paused',
        finished: 'Finished',
      },
    };

    const statusMap = statusMaps[language] || statusMaps.zh;
    return statusMap[status] || status;
  },

  formatDuration: ms => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    if (minutes > 0) {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    return `${seconds}秒`;
  },

  generateRoomName: (gameType, _mode) => {
    void _mode;
    const adjectives = [
      '快乐',
      '激烈',
      '友好',
      '刺激',
      '挑战',
      '休闲',
      '竞技',
      '有趣',
    ];
    const nouns = ['房间', '大厅', '战场', '擂台', '竞技场', '游戏室'];
    const gameConfig = gameUtils.getGameConfig(gameType);
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${randomAdj}的${gameConfig.name}${randomNoun}`;
  },

  isFeatureSupported: (gameType, feature) => {
    const config = gameUtils.getGameConfig(gameType);
    return config.supportedFeatures.includes(feature);
  },

  getRecommendedSettings: (gameType, _mode, playerCount) => {
    const config = gameUtils.getGameConfig(gameType);
    void _mode;

    const baseSettings = {
      maxPlayers: Math.min(playerCount + 2, config.maxPlayers),
      gameSpeed: 'normal',
      timeLimit: null,
      spectatorMode: true,
    };

    switch (gameType) {
      case 'snake':
        return {
          ...baseSettings,
          boardSize: playerCount > 4 ? 25 : 20,
          gameSpeed: playerCount > 4 ? 'slow' : 'normal',
        };
      case 'gomoku':
        return {
          ...baseSettings,
          boardSize: 15,
          timeLimit: 300,
        };
      default:
        return baseSettings;
    }
  },
};
