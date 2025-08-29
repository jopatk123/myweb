<!--
  玩家列表组件 - 可复用的房间内玩家显示组件
  用于显示房间内玩家信息，包括准备状态、颜色等
-->
<template>
  <div class="player-list">
    <div class="player-list-header">
      <h4>{{ title }} ({{ players.length }}/{{ maxPlayers }})</h4>
      <slot name="header-actions">
        <!-- 可以放置房主控制按钮等 -->
      </slot>
    </div>
    
    <div class="players-container">
      <div 
        v-for="player in players" 
        :key="player.id || player.session_id"
        class="player-card"
        :class="{ 
          'player-ready': player.is_ready,
          'player-host': isHost(player),
          'player-self': isSelf(player)
        }"
      >
        <!-- 玩家头像 -->
        <div 
          class="player-avatar"
          :style="{ backgroundColor: player.player_color || getRandomColor(player) }"
        >
          {{ getPlayerInitial(player.player_name) }}
          
          <!-- 准备状态指示 -->
          <div v-if="player.is_ready" class="ready-badge">
            <span class="ready-icon">✓</span>
          </div>
          
          <!-- 房主标识 -->
          <div v-if="isHost(player)" class="host-badge">
            <span class="host-icon">👑</span>
          </div>
        </div>
        
        <!-- 玩家信息 -->
        <div class="player-info">
          <div class="player-name">
            {{ player.player_name }}
            <span v-if="isSelf(player)" class="self-indicator">(我)</span>
          </div>
          
          <div class="player-status">
            <span 
              v-if="player.is_ready" 
              class="status-ready"
            >
              ✓ 已准备
            </span>
            <span 
              v-else 
              class="status-waiting"
            >
              ⏳ 等待中
            </span>
            
            <!-- 额外状态信息插槽 -->
            <slot name="player-status" :player="player">
              <!-- 可以显示游戏特定的状态，如分数等 -->
            </slot>
          </div>
        </div>
        
        <!-- 玩家操作按钮 -->
        <div class="player-actions">
          <slot name="player-actions" :player="player" :isHost="isHost" :isSelf="isSelf">
            <!-- 如果是房主且不是自己，可以显示踢出按钮等 -->
            <button
              v-if="canKick && isHost(currentUser) && !isSelf(player) && !isHost(player)"
              class="kick-btn"
              @click="$emit('kick-player', player)"
              :disabled="actionDisabled"
            >
              ❌
            </button>
          </slot>
        </div>
      </div>
      
      <!-- 空位占位符 -->
      <div 
        v-for="i in emptySlots" 
        :key="`empty-${i}`"
        class="empty-slot"
      >
        <div class="empty-avatar">
          <span class="empty-icon">👤</span>
        </div>
        <div class="empty-info">
          <div class="empty-text">等待玩家加入...</div>
        </div>
      </div>
    </div>
    
    <!-- 统计信息 -->
    <div v-if="showStats" class="player-stats">
      <div class="stat-item">
        <span class="stat-label">已准备:</span>
        <span class="stat-value">{{ readyCount }}/{{ players.length }}</span>
      </div>
      <div v-if="allReady && players.length >= minPlayers" class="all-ready-indicator">
        🎮 所有玩家已准备，可以开始游戏！
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerList',
  props: {
    players: {
      type: Array,
      default: () => []
    },
    maxPlayers: {
      type: Number,
      default: 4
    },
    minPlayers: {
      type: Number,
      default: 1
    },
    currentUser: {
      type: Object,
      default: null
    },
    hostId: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: '房间玩家'
    },
    showStats: {
      type: Boolean,
      default: true
    },
    canKick: {
      type: Boolean,
      default: false
    },
    actionDisabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['kick-player'],
  computed: {
    readyCount() {
      return this.players.filter(p => p.is_ready).length;
    },
    allReady() {
      return this.players.length > 0 && this.readyCount === this.players.length;
    },
    emptySlots() {
      return Math.max(0, this.maxPlayers - this.players.length);
    }
  },
  methods: {
    isHost(player) {
      if (!player) return false;
      const playerId = player.id || player.session_id;
      return playerId === this.hostId || 
             (this.currentUser && playerId === this.currentUser.created_by);
    },
    isSelf(player) {
      if (!player || !this.currentUser) return false;
      const playerId = player.id || player.session_id;
      const currentUserId = this.currentUser.id || this.currentUser.session_id;
      return playerId === currentUserId;
    },
    getPlayerInitial(name) {
      return name ? name.charAt(0).toUpperCase() : '?';
    },
    getRandomColor(player) {
      // 为没有颜色的玩家生成一个基于名称的颜色
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFD93D',
        '#FF8C69', '#87CEEB', '#DEB887', '#F0E68C'
      ];
      const name = player.player_name || player.id || '';
      const index = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return colors[index % colors.length];
    }
  }
}
</script>

<style scoped>
.player-list {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.player-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f8f9fa;
}

.player-list-header h4 {
  margin: 0;
  color: #212529;
  font-weight: 600;
}

.players-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
}

.player-card:hover {
  background: #e9ecef;
}

.player-card.player-ready {
  border-color: #28a745;
  background: linear-gradient(135deg, #d4edda, #f8f9fa);
}

.player-card.player-host {
  border-color: #ffc107;
  background: linear-gradient(135deg, #fff3cd, #f8f9fa);
}

.player-card.player-self {
  border-color: #007bff;
  background: linear-gradient(135deg, #e7f3ff, #f8f9fa);
}

.player-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.ready-badge,
.host-badge {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  font-size: 10px;
  font-weight: bold;
}

.ready-badge {
  top: -2px;
  right: -2px;
  background: #28a745;
  color: white;
}

.host-badge {
  top: -6px;
  left: -6px;
  background: #ffc107;
  color: #212529;
  font-size: 12px;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-weight: 600;
  color: #212529;
  font-size: 16px;
  margin-bottom: 4px;
}

.self-indicator {
  font-weight: normal;
  color: #007bff;
  font-size: 14px;
}

.player-status {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-ready {
  color: #28a745;
  font-weight: 600;
}

.status-waiting {
  color: #ffc107;
  font-weight: 500;
}

.player-actions {
  display: flex;
  gap: 8px;
}

.kick-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kick-btn:hover:not(:disabled) {
  background: #c82333;
  transform: scale(1.05);
}

.kick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-slot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #dee2e6;
  opacity: 0.6;
}

.empty-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9ecef;
  color: #6c757d;
  font-size: 20px;
}

.empty-info {
  flex: 1;
}

.empty-text {
  color: #6c757d;
  font-style: italic;
  font-size: 14px;
}

.player-stats {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px solid #f8f9fa;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.stat-label {
  color: #6c757d;
}

.stat-value {
  font-weight: 600;
  color: #212529;
}

.all-ready-indicator {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  border: 1px solid #c3e6cb;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* 响应式设计 */
@media (max-width: 600px) {
  .player-list {
    padding: 16px;
  }
  
  .player-card {
    padding: 10px;
  }
  
  .player-avatar {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .ready-badge,
  .host-badge {
    width: 16px;
    height: 16px;
    font-size: 8px;
  }
  
  .player-name {
    font-size: 14px;
  }
  
  .player-status {
    font-size: 12px;
  }
}
</style>
