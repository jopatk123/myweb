<!--
  房间卡片组件 - 可复用的房间显示组件
  用于在大厅显示房间信息，支持加入/观战操作
-->
<template>
  <div 
    class="room-card"
    :class="{ 
      'room-full': room.current_players >= room.max_players,
      'room-playing': room.status === 'playing',
      'room-finished': room.status === 'finished'
    }"
  >
    <!-- 房间头部 -->
    <div class="room-header">
      <span class="room-code">{{ room.room_code }}</span>
      <span class="room-mode" :class="`mode-${room.mode}`">
        <slot name="mode-icon" :mode="room.mode">
          {{ getModeIcon(room.mode) }}
        </slot>
        {{ getModeLabel(room.mode) }}
      </span>
    </div>

    <!-- 房间信息 -->
    <div class="room-info">
      <div class="player-count">
        <span class="count">{{ room.current_players }}/{{ room.max_players }}</span>
        <span class="label">玩家</span>
      </div>
      <div class="room-status">
        <span class="status" :class="`status-${room.status}`">
          {{ getStatusText(room.status) }}
        </span>
      </div>
    </div>

    <!-- 房间内玩家头像 -->
    <div class="room-players">
      <div 
        v-for="player in visiblePlayers" 
        :key="player.id"
        class="player-avatar"
        :style="{ backgroundColor: player.player_color }"
        :title="`${player.player_name}${player.is_ready ? ' (已准备)' : ''}`"
      >
        {{ getPlayerInitial(player.player_name) }}
        <span v-if="player.is_ready" class="ready-indicator">✓</span>
      </div>
      <div v-if="room.players && room.players.length > maxVisiblePlayers" class="more-players">
        +{{ room.players.length - maxVisiblePlayers }}
      </div>
    </div>

    <!-- 房间操作按钮 -->
    <div class="room-actions">
      <button 
        v-if="canJoin"
        class="btn-join"
        @click="$emit('join', room.room_code)"
        :disabled="disabled"
      >
        🚪 {{ joinButtonText }}
      </button>
      <button 
        v-else-if="canSpectate"
        class="btn-spectate"
        @click="$emit('spectate', room.room_code)"
        :disabled="disabled"
      >
        👁️ 观战
      </button>
      <button 
        v-else
        class="btn-disabled"
        disabled
      >
        {{ getDisabledButtonText() }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RoomCard',
  props: {
    room: {
      type: Object,
      required: true,
      validator: (room) => {
        return room && typeof room.room_code === 'string' && 
               typeof room.status === 'string' && 
               typeof room.mode === 'string';
      }
    },
    disabled: {
      type: Boolean,
      default: false
    },
    maxVisiblePlayers: {
      type: Number,
      default: 4
    },
    joinButtonText: {
      type: String,
      default: '加入'
    },
    // 自定义模式配置
    modeConfig: {
      type: Object,
      default: () => ({
        shared: { icon: '🤝', label: '共享' },
        competitive: { icon: '⚔️', label: '竞技' }
      })
    }
  },
  emits: ['join', 'spectate'],
  computed: {
    visiblePlayers() {
      return (this.room.players || []).slice(0, this.maxVisiblePlayers);
    },
    canJoin() {
      return this.room.status === 'waiting' && 
             this.room.current_players < this.room.max_players;
    },
    canSpectate() {
      return this.room.status === 'playing';
    }
  },
  methods: {
    getModeIcon(mode) {
      return this.modeConfig[mode]?.icon || '🎮';
    },
    getModeLabel(mode) {
      return this.modeConfig[mode]?.label || mode;
    },
    getStatusText(status) {
      const statusMap = {
        waiting: '等待中',
        playing: '游戏中',
        finished: '已结束'
      };
      return statusMap[status] || status;
    },
    getPlayerInitial(name) {
      return name ? name.charAt(0).toUpperCase() : '?';
    },
    getDisabledButtonText() {
      if (this.room.current_players >= this.room.max_players) {
        return '已满';
      }
      return this.room.status === 'finished' ? '已结束' : '游戏中';
    }
  }
}
</script>

<style scoped>
.room-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.room-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #007bff, #28a745);
  opacity: 0;
  transition: opacity 0.3s;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.15);
  border-color: #007bff;
}

.room-card:hover::before {
  opacity: 1;
}

.room-card.room-full {
  opacity: 0.7;
  border-color: #ffc107;
}

.room-card.room-playing::before {
  background: linear-gradient(90deg, #28a745, #20c997);
  opacity: 1;
}

.room-card.room-finished {
  opacity: 0.6;
  border-color: #6c757d;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.room-code {
  font-size: 18px;
  font-weight: bold;
  color: #212529;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.room-mode {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.mode-shared {
  background: linear-gradient(45deg, #007bff, #0056b3);
}

.mode-competitive {
  background: linear-gradient(45deg, #dc3545, #c82333);
}

.room-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.player-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.player-count .count {
  font-size: 16px;
  font-weight: bold;
  color: #007bff;
}

.player-count .label {
  font-size: 12px;
  color: #6c757d;
}

.room-status .status {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-waiting {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-playing {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-finished {
  background: #d6d8db;
  color: #383d41;
  border: 1px solid #c6c8ca;
}

.room-players {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  position: relative;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.player-avatar:hover {
  transform: scale(1.1);
}

.ready-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  background: #28a745;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  border: 1px solid white;
}

.more-players {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #6c757d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  border: 2px solid white;
}

.room-actions {
  display: flex;
  gap: 8px;
}

.btn-join,
.btn-spectate,
.btn-disabled {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-join {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
}

.btn-join:hover:not(:disabled) {
  background: linear-gradient(135deg, #218838, #1c9872);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.btn-spectate {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
}

.btn-spectate:hover:not(:disabled) {
  background: linear-gradient(135deg, #138496, #0f6674);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
}

.btn-disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.btn-join:disabled,
.btn-spectate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
