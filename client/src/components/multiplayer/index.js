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
export { default as StatsModal } from './StatsModal.vue'
export { default as LeaderboardModal } from './LeaderboardModal.vue'
export { default as VotersDisplay } from './VotersDisplay.vue'

// Composables (修正路径: 从 components/multiplayer 到 composables/multiplayer 需要 ../../ )
export { useMultiplayerRoom } from '../../composables/multiplayer/useMultiplayerRoom.js'

// 类型定义和常量
export const GAME_MODES = {
  SHARED: 'shared',
  COMPETITIVE: 'competitive'
}

export const GAME_STATUS = {
  WAITING: 'waiting',
  STARTING: 'starting', 
  PLAYING: 'playing',
  FINISHED: 'finished'
}

export const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
}

// 默认配置
export const DEFAULT_GAME_MODES = [
  {
    value: 'shared',
    icon: '🤝',
    label: '共享模式',
    description: '多人控制一条蛇'
  },
  {
    value: 'competitive', 
    icon: '⚔️',
    label: '竞技模式',
    description: '双人对战'
  }
]

export const DEFAULT_PLAYER_COUNTS = [2, 4, 6, 8]

// 工具函数
export const gameUtils = {
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
   * 生成玩家颜色
   */
  generatePlayerColor: (playerId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFD93D',
      '#FF8C69', '#87CEEB', '#DEB887', '#F0E68C'
    ]
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
   * 验证玩家名称
   */
  validatePlayerName: (name) => {
    const trimmed = name.trim()
    return {
      isValid: trimmed.length >= 1 && trimmed.length <= 20,
      message: trimmed.length === 0 ? '请输入昵称' : 
               trimmed.length > 20 ? '昵称最多20个字符' : ''
    }
  },

  /**
   * 获取房间状态文本
   */
  getStatusText: (status) => {
    const statusMap = {
      waiting: '等待中',
      starting: '准备开始', 
      playing: '游戏中',
      finished: '已结束'
    }
    return statusMap[status] || status
  }
}
