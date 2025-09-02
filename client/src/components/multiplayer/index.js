/**
 * 多人游戏通用组件库
 * 导出所有可复用的多人游戏组件和composables
 */

// 基础组件
export { default as GameLobby } from './lobby/GameLobby.vue'
export { default as RoomCard } from './RoomCard.vue'
export { default as CreateRoomModal } from './CreateRoomModal.vue'
export { default as PlayerList } from './PlayerList.vue'
export { default as ReadyControls } from './ReadyControls.vue'
export { default as VoteButtons } from './VoteButtons.vue'
export { default as SharedGamePanel } from './SharedGamePanel.vue'
export { default as CompetitiveGamePanel } from './CompetitiveGamePanel.vue'
export { default as VotersDisplay } from './VotersDisplay.vue'

// 大厅子组件
export { default as LobbyHeader } from './lobby/LobbyHeader.vue'
export { default as QuickStart } from './lobby/QuickStart.vue'
export { default as RoomList } from './lobby/RoomList.vue'
export { default as ConnectionStatus } from './lobby/ConnectionStatus.vue'
export { default as ErrorMessage } from './lobby/ErrorMessage.vue'

// 房间子组件
export { default as GameStatusInfo } from './GameStatusInfo.vue'
export { default as CountdownOverlay } from './CountdownOverlay.vue'
export { default as ReadyButton } from './ReadyButton.vue'
export { default as StartGameButton } from './StartGameButton.vue'

// Composables
export { useMultiplayerRoom } from '../../composables/multiplayer/useMultiplayerRoom.js'

// 类型定义和常量
export const GAME_MODES = {
  SHARED: 'shared',
  COMPETITIVE: 'competitive',
  COOPERATIVE: 'cooperative',
  BATTLE_ROYALE: 'battle_royale',
  TEAM: 'team'
}

export const GAME_STATUS = {
  WAITING: 'waiting',
  STARTING: 'starting', 
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished'
}

export const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
}

export const PLAYER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  READY: 'ready',
  NOT_READY: 'not_ready',
  PLAYING: 'playing',
  SPECTATING: 'spectating'
}

// 游戏类型配置
export const GAME_TYPE_CONFIGS = {
  snake: {
    name: '贪吃蛇',
    icon: '🐍',
    minPlayers: 1,
    maxPlayers: 8,
    defaultModes: ['shared', 'competitive'],
    supportedFeatures: ['voting', 'spectating', 'chat']
  },
  gomoku: {
    name: '五子棋',
    icon: '⚫',
    minPlayers: 2,
    maxPlayers: 2,
    defaultModes: ['competitive'],
    supportedFeatures: ['spectating', 'chat', 'undo']
  },
  chess: {
    name: '象棋',
    icon: '♟️',
    minPlayers: 2,
    maxPlayers: 2,
    defaultModes: ['competitive'],
    supportedFeatures: ['spectating', 'chat', 'undo', 'timer']
  },
  tank: {
    name: '坦克大战',
    icon: '🚗',
    minPlayers: 1,
    maxPlayers: 4,
    defaultModes: ['battle_royale', 'team'],
    supportedFeatures: ['power_ups', 'destructible_terrain']
  }
}

// 默认游戏模式配置
export const DEFAULT_GAME_MODES = [
  {
    value: 'shared',
    icon: '🤝',
    label: '共享模式',
    description: '多人协作控制'
  },
  {
    value: 'competitive', 
    icon: '⚔️',
    label: '竞技模式',
    description: '玩家对战'
  },
  {
    value: 'cooperative',
    icon: '🤝',
    label: '合作模式',
    description: '团队协作'
  },
  {
    value: 'battle_royale',
    icon: '👑',
    label: '大逃杀',
    description: '最后生存者'
  },
  {
    value: 'team',
    icon: '👥',
    label: '团队模式',
    description: '团队对战'
  }
]

export const DEFAULT_PLAYER_COUNTS = [2, 4, 6, 8]

// 主题配置
export const THEMES = {
  light: {
    name: '浅色主题',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529'
    }
  },
  dark: {
    name: '深色主题',
    colors: {
      primary: '#0d6efd',
      secondary: '#6c757d',
      success: '#198754',
      warning: '#ffc107',
      danger: '#dc3545',
      background: '#212529',
      surface: '#343a40',
      text: '#ffffff'
    }
  }
}

// 工具函数
export const gameUtils = {
  /**
   * 获取游戏类型配置
   */
  getGameConfig: (gameType) => {
    return GAME_TYPE_CONFIGS[gameType] || {
      name: gameType,
      icon: '🎮',
      minPlayers: 1,
      maxPlayers: 8,
      defaultModes: ['competitive'],
      supportedFeatures: []
    }
  },

  /**
   * 获取游戏模式配置
   */
  getModeConfig: (modes = DEFAULT_GAME_MODES) => {
    return modes.reduce((acc, mode) => {
      acc[mode.value] = mode
      return acc
    }, {})
  },

  /**
   * 根据游戏类型过滤模式
   */
  getAvailableModes: (gameType, allModes = DEFAULT_GAME_MODES) => {
    const config = gameUtils.getGameConfig(gameType)
    return allModes.filter(mode => 
      config.defaultModes.includes(mode.value)
    )
  },

  /**
   * 生成玩家颜色
   */
  generatePlayerColor: (playerId, colorScheme = 'default') => {
    const colorSchemes = {
      default: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFD93D',
        '#FF8C69', '#87CEEB', '#DEB887', '#F0E68C'
      ],
      vibrant: [
        '#FF5722', '#E91E63', '#9C27B0', '#673AB7',
        '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
        '#009688', '#4CAF50', '#8BC34A', '#CDDC39'
      ],
      pastel: [
        '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
        '#BAE1FF', '#C9B3FF', '#FFBAF3', '#B3FFBA',
        '#FFC9B3', '#B3C9FF', '#F3B3FF', '#B3FFF3'
      ]
    }
    
    const colors = colorSchemes[colorScheme] || colorSchemes.default
    const index = playerId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  },

  /**
   * 格式化房间码
   */
  formatRoomCode: (code) => {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  },

  /**
   * 验证房间码
   */
  validateRoomCode: (code) => {
    const formatted = gameUtils.formatRoomCode(code)
    return {
      isValid: formatted.length >= 4 && formatted.length <= 10,
      formatted,
      message: formatted.length === 0 ? '请输入房间码' :
               formatted.length < 4 ? '房间码至少4位' :
               formatted.length > 10 ? '房间码最多10位' : ''
    }
  },

  /**
   * 验证玩家名称
   */
  validatePlayerName: (name, options = {}) => {
    const { 
      minLength = 1, 
      maxLength = 20, 
      allowEmoji = true,
      forbiddenWords = []
    } = options
    
    const trimmed = name.trim()
    
    if (trimmed.length < minLength) {
      return {
        isValid: false,
        message: `昵称至少${minLength}个字符`
      }
    }
    
    if (trimmed.length > maxLength) {
      return {
        isValid: false,
        message: `昵称最多${maxLength}个字符`
      }
    }
    
    if (!allowEmoji && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu.test(trimmed)) {
      return {
        isValid: false,
        message: '昵称不能包含表情符号'
      }
    }
    
    const hasForbiddenWord = forbiddenWords.some(word => 
      trimmed.toLowerCase().includes(word.toLowerCase())
    )
    
    if (hasForbiddenWord) {
      return {
        isValid: false,
        message: '昵称包含敏感词汇'
      }
    }
    
    return {
      isValid: true,
      message: '',
      formatted: trimmed
    }
  },

  /**
   * 获取房间状态文本
   */
  getStatusText: (status, language = 'zh') => {
    const statusMaps = {
      zh: {
        waiting: '等待中',
        starting: '准备开始', 
        playing: '游戏中',
        paused: '已暂停',
        finished: '已结束'
      },
      en: {
        waiting: 'Waiting',
        starting: 'Starting',
        playing: 'Playing',
        paused: 'Paused',
        finished: 'Finished'
      }
    }
    
    const statusMap = statusMaps[language] || statusMaps.zh
    return statusMap[status] || status
  },

  /**
   * 格式化时间持续
   */
  formatDuration: (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    } else if (minutes > 0) {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
    } else {
      return `${seconds}秒`
    }
  },

  /**
   * 生成随机房间名称
   */
  generateRoomName: (gameType, _mode) => {
  void _mode
    const adjectives = ['快乐', '激烈', '友好', '刺激', '挑战', '休闲', '竞技', '有趣']
    const nouns = ['房间', '大厅', '战场', '擂台', '竞技场', '游戏室']
    
    const gameConfig = gameUtils.getGameConfig(gameType)
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    
    return `${randomAdj}的${gameConfig.name}${randomNoun}`
  },

  /**
   * 检查功能支持
   */
  isFeatureSupported: (gameType, feature) => {
    const config = gameUtils.getGameConfig(gameType)
    return config.supportedFeatures.includes(feature)
  },

  /**
   * 获取推荐设置
   */
  getRecommendedSettings: (gameType, _mode, playerCount) => {
    const config = gameUtils.getGameConfig(gameType)
  void _mode
    
    // 基础推荐设置
    const baseSettings = {
      maxPlayers: Math.min(playerCount + 2, config.maxPlayers),
      gameSpeed: 'normal',
      timeLimit: null,
      spectatorMode: true
    }
    
    // 根据游戏类型调整
    switch (gameType) {
      case 'snake':
        return {
          ...baseSettings,
          boardSize: playerCount > 4 ? 25 : 20,
          gameSpeed: playerCount > 4 ? 'slow' : 'normal'
        }
      case 'gomoku':
        return {
          ...baseSettings,
          boardSize: 15,
          timeLimit: 300 // 5分钟
        }
      default:
        return baseSettings
    }
  }
}

// 事件系统
export class MultiplayerEventBus {
  constructor() {
    this.events = new Map()
  }
  
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event).add(handler)
  }
  
  off(event, handler) {
    if (this.events.has(event)) {
      this.events.get(event).delete(handler)
    }
  }
  
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(handler => {
        try {
          handler(data)
        } catch (err) {
          console.error(`Event handler error [${event}]:`, err)
        }
      })
    }
  }
  
  clear(event) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}

// 全局事件总线实例
export const multiplayerEvents = new MultiplayerEventBus()

// 组件配置预设
export const COMPONENT_PRESETS = {
  // 快速开始预设
  quickStart: {
    showModeSelector: true,
    showPlayerCount: true,
    showCreateRoom: true
  },
  
  // 简化预设
  minimal: {
    showModeSelector: false,
    showPlayerCount: false,
    showCreateRoom: false
  },
  
  // 完整功能预设
  full: {
    showModeSelector: true,
    showPlayerCount: true,
    showCreateRoom: true,
  // stats/leaderboard removed
    showSettings: true
  }
}