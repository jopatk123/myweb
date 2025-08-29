<!--
  准备控制组件 - 处理玩家准备状态和开始游戏的控制
  用于房间中的准备/开始游戏功能
-->
<template>
  <div class="ready-controls">
    <!-- 玩家准备按钮 -->
    <div v-if="!isHost" class="player-ready-section">
      <button 
        class="ready-btn"
        :class="{ 
          'ready-active': isReady,
          'ready-inactive': !isReady
        }"
        @click="toggleReady"
        :disabled="disabled || gameStarted"
      >
        <span class="ready-icon">{{ isReady ? '✅' : '⏳' }}</span>
        <span class="ready-text">
          {{ isReady ? '已准备' : '准备' }}
        </span>
      </button>
      
      <div class="ready-hint">
        {{ readyHintText }}
      </div>
    </div>

    <!-- 房主控制区域 -->
    <div v-else class="host-controls">
      <!-- 房主自己的准备状态 -->
      <div class="host-ready-section">
        <button 
          class="ready-btn host-ready-btn"
          :class="{ 
            'ready-active': isReady,
            'ready-inactive': !isReady
          }"
          @click="toggleReady"
          :disabled="disabled || gameStarted"
        >
          <span class="ready-icon">{{ isReady ? '✅' : '⏳' }}</span>
          <span class="ready-text">
            {{ isReady ? '房主已准备' : '房主准备' }}
          </span>
        </button>
      </div>

      <!-- 开始游戏按钮 -->
      <div class="start-game-section">
        <button 
          class="start-game-btn"
          :class="{ 
            'can-start': canStartGame,
            'cannot-start': !canStartGame
          }"
          @click="startGame"
          :disabled="!canStartGame || disabled || gameStarted"
        >
          <span class="start-icon">🚀</span>
          <span class="start-text">
            {{ gameStarted ? '游戏进行中...' : '开始游戏' }}
          </span>
        </button>
        
        <div class="start-hint">
          {{ startHintText }}
        </div>
      </div>

      <!-- 房主额外控制 -->
      <div v-if="showExtraControls" class="extra-controls">
        <slot name="host-controls" :room="room" :players="players">
          <!-- 可以放置踢出玩家、修改设置等按钮 -->
        </slot>
      </div>
    </div>

    <!-- 游戏状态信息 -->
    <div v-if="showGameStatus" class="game-status">
      <div class="status-item">
        <span class="status-label">房间状态:</span>
        <span class="status-value" :class="`status-${gameStatus}`">
          {{ getStatusText(gameStatus) }}
        </span>
      </div>
      
      <div class="status-item">
        <span class="status-label">准备状态:</span>
        <span class="status-value">
          {{ readyCount }}/{{ totalPlayers }} 已准备
        </span>
      </div>
    </div>

    <!-- 游戏倒计时 -->
    <div v-if="countdown > 0" class="countdown-overlay">
      <div class="countdown-content">
        <div class="countdown-number">{{ countdown }}</div>
        <div class="countdown-text">游戏即将开始...</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReadyControls',
  props: {
    // 玩家状态
    isHost: {
      type: Boolean,
      default: false
    },
    isReady: {
      type: Boolean,
      default: false
    },
    
    // 房间和游戏状态
    room: {
      type: Object,
      default: null
    },
    players: {
      type: Array,
      default: () => []
    },
    gameStatus: {
      type: String,
      default: 'waiting' // waiting, starting, playing, finished
    },
    
    // 控制状态
    disabled: {
      type: Boolean,
      default: false
    },
    showExtraControls: {
      type: Boolean,
      default: true
    },
    showGameStatus: {
      type: Boolean,
      default: true
    },
    
    // 开始游戏的最小玩家数要求
    minPlayers: {
      type: Number,
      default: 1
    },
    
    // 倒计时
    countdown: {
      type: Number,
      default: 0
    },

    // 自定义文本
    readyText: {
      type: String,
      default: '准备'
    },
    readyActiveText: {
      type: String,
      default: '已准备'
    },
    startGameText: {
      type: String,
      default: '开始游戏'
    }
  },
  emits: ['toggle-ready', 'start-game'],
  computed: {
    totalPlayers() {
      return this.players.length;
    },
    readyCount() {
      return this.players.filter(p => p.is_ready).length;
    },
    allPlayersReady() {
      return this.totalPlayers > 0 && this.readyCount === this.totalPlayers;
    },
    canStartGame() {
      return this.isHost && 
             this.allPlayersReady && 
             this.totalPlayers >= this.minPlayers &&
             this.gameStatus === 'waiting';
    },
    gameStarted() {
      return ['starting', 'playing'].includes(this.gameStatus);
    },
    readyHintText() {
      if (this.gameStarted) {
        return '游戏已开始';
      }
      if (this.isReady) {
        return '等待其他玩家准备...';
      }
      return '点击按钮表示准备就绪';
    },
    startHintText() {
      if (this.gameStarted) {
        return '游戏进行中';
      }
      if (this.totalPlayers < this.minPlayers) {
        return `需要至少 ${this.minPlayers} 名玩家`;
      }
      if (!this.allPlayersReady) {
        const waitingCount = this.totalPlayers - this.readyCount;
        return `等待 ${waitingCount} 名玩家准备`;
      }
      return '所有玩家已准备，可以开始游戏';
    }
  },
  methods: {
    toggleReady() {
      if (this.disabled || this.gameStarted) return;
      this.$emit('toggle-ready');
    },
    startGame() {
      if (!this.canStartGame || this.disabled) return;
      this.$emit('start-game');
    },
    getStatusText(status) {
      const statusMap = {
        waiting: '等待中',
        starting: '准备开始',
        playing: '游戏中',
        finished: '已结束'
      };
      return statusMap[status] || status;
    }
  }
}
</script>

<style scoped>
.ready-controls {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.player-ready-section,
.host-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ready-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-height: 56px;
}

.ready-btn.ready-inactive {
  background: linear-gradient(135deg, #ffc107, #ffca2c);
  color: #212529;
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
}

.ready-btn.ready-inactive:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffca2c, #ffd43b);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 193, 7, 0.4);
}

.ready-btn.ready-active {
  background: linear-gradient(135deg, #28a745, #34ce57);
  color: white;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.ready-btn.ready-active:hover:not(:disabled) {
  background: linear-gradient(135deg, #34ce57, #28a745);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
}

.ready-icon {
  font-size: 20px;
}

.ready-text {
  font-size: 16px;
}

.ready-hint {
  text-align: center;
  font-size: 14px;
  color: #6c757d;
  font-style: italic;
}

.host-ready-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
}

.host-ready-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3, #004085);
}

.start-game-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 40px;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 1px;
  min-height: 64px;
  position: relative;
  overflow: hidden;
}

.start-game-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.6s;
}

.start-game-btn.can-start {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
}

.start-game-btn.can-start:hover:not(:disabled) {
  background: linear-gradient(135deg, #20c997, #17a2b8);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.5);
}

.start-game-btn.can-start:hover::before {
  left: 100%;
}

.start-game-btn.cannot-start {
  background: #6c757d;
  color: white;
  cursor: not-allowed;
}

.start-icon {
  font-size: 24px;
}

.start-text {
  font-size: 18px;
}

.start-hint {
  text-align: center;
  font-size: 14px;
  color: #6c757d;
  margin-top: 8px;
}

.extra-controls {
  padding-top: 16px;
  border-top: 2px solid #f8f9fa;
}

.game-status {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-weight: 500;
  color: #495057;
}

.status-value {
  font-weight: 600;
}

.status-waiting {
  color: #ffc107;
}

.status-starting {
  color: #17a2b8;
}

.status-playing {
  color: #28a745;
}

.status-finished {
  color: #6c757d;
}

.countdown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 10;
}

.countdown-content {
  text-align: center;
  color: white;
}

.countdown-number {
  font-size: 72px;
  font-weight: 900;
  margin-bottom: 16px;
  animation: countdownPulse 1s ease-in-out;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.countdown-text {
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
}

@keyframes countdownPulse {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
}

.ready-btn:disabled,
.start-game-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* 响应式设计 */
@media (max-width: 600px) {
  .ready-controls {
    padding: 16px;
  }
  
  .ready-btn {
    padding: 12px 24px;
    font-size: 14px;
    min-height: 48px;
  }
  
  .start-game-btn {
    padding: 16px 32px;
    font-size: 16px;
    min-height: 56px;
  }
  
  .ready-icon,
  .start-icon {
    font-size: 18px;
  }
  
  .countdown-number {
    font-size: 56px;
  }
  
  .countdown-text {
    font-size: 16px;
  }
}
</style>
