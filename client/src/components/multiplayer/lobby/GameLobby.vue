<template>
  <div class="multiplayer-lobby">
    <!-- 头部导航 -->
    <div class="lobby-header">
      <h2>{{ title }}</h2>
      <div class="header-actions">
        <slot name="header-actions">
          <button class="btn-secondary" @click="$emit('showStats')">
            📊 统计信息
          </button>
          <button class="btn-secondary" @click="$emit('showLeaderboard')">
            🏆 排行榜
          </button>
        </slot>
        <button class="btn-secondary" @click="refreshRooms" :disabled="loading">
          🔄 刷新房间
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      ⚠️ {{ error }}
      <button @click="clearError" class="close-btn">&times;</button>
    </div>

    <!-- 连接状态 -->
    <div v-if="!isConnected" class="connection-status">
      <div class="loading-spinner"></div>
      <span>连接服务器中...</span>
    </div>

    <div v-else class="lobby-content">
      <!-- 快速开始区域 -->
      <div class="quick-start-section">
        <h3>快速开始</h3>
        <div class="quick-start-controls">
          <input
            v-model="playerName"
            type="text"
            :placeholder="playerNamePlaceholder"
            maxlength="20"
            class="player-name-input"
            @keyup.enter="quickJoin"
          />
          
          <!-- 游戏模式选择器插槽 -->
          <slot name="mode-selector" :selectedMode="selectedMode" :onModeChange="handleModeChange">
            <div class="game-mode-selector">
              <label v-for="mode in gameModes" :key="mode.value">
                <input v-model="selectedMode" type="radio" :value="mode.value" />
                <span class="mode-option">
                  {{ mode.icon }} {{ mode.label }}
                  <small>{{ mode.description }}</small>
                </span>
              </label>
            </div>
          </slot>
          
          <div class="quick-start-buttons">
            <button 
              class="btn-primary"
              @click="quickJoin"
              :disabled="!playerName.trim() || loading"
            >
              🚀 快速匹配
            </button>
            
            <button 
              class="btn-secondary"
              @click="showCreateRoom = true"
              :disabled="!playerName.trim()"
            >
              ➕ 创建房间
            </button>
          </div>
        </div>
      </div>

      <!-- 房间列表 -->
      <div class="rooms-section">
        <div class="section-header">
          <h3>🏠 活跃房间 ({{ activeRooms.length }})</h3>
          <div class="room-filters">
            <select v-model="roomFilter" class="filter-select">
              <option value="all">所有房间</option>
              <option value="waiting">等待中</option>
              <option value="playing">游戏中</option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <span>加载房间列表...</span>
        </div>

        <div v-else-if="filteredRooms.length === 0" class="empty-rooms">
          <div class="empty-icon">🏠</div>
          <h4>暂无活跃房间</h4>
          <p>创建一个新房间开始游戏吧！</p>
        </div>

        <div v-else class="rooms-grid">
          <div 
            v-for="room in filteredRooms" 
            :key="room.id"
            class="room-card"
            :class="`room-${room.status}`"
          >
            <div class="room-header">
              <div class="room-code">{{ room.room_code }}</div>
              <div class="room-status" :class="`status-${room.status}`">
                {{ getStatusText(room.status) }}
              </div>
            </div>

            <div class="room-info">
              <div class="room-mode">
                <slot name="room-mode" :room="room">
                  <span class="mode-badge" :class="`mode-${room.mode}`">
                    {{ getModeText(room.mode) }}
                  </span>
                </slot>
              </div>
              
              <div class="room-players">
                👥 {{ room.current_players }}/{{ room.max_players }}
              </div>
              
              <div class="room-created">
                🕒 {{ formatTime(room.created_at) }}
              </div>
            </div>

            <div class="room-actions">
              <button 
                class="btn-primary btn-small"
                @click="joinRoom(room.room_code)"
                :disabled="room.current_players >= room.max_players || room.status !== 'waiting'"
              >
                {{ room.status === 'waiting' ? '🚪 加入' : '👁️ 观看' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建房间对话框 -->
    <div v-if="showCreateRoom" class="modal-overlay" @click.self="showCreateRoom = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建新房间</h3>
          <button class="modal-close" @click="showCreateRoom = false">&times;</button>
        </div>
        
        <div class="modal-body">
          <!-- 创建房间表单插槽 -->
          <slot name="create-room-form" :roomConfig="roomConfig" :onConfigChange="handleConfigChange">
            <div class="form-group">
              <label>游戏模式</label>
              <select v-model="roomConfig.mode" class="form-control">
                <option v-for="mode in gameModes" :key="mode.value" :value="mode.value">
                  {{ mode.icon }} {{ mode.label }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>最大玩家数</label>
              <input 
                v-model.number="roomConfig.maxPlayers" 
                type="number" 
                min="2" 
                max="8" 
                class="form-control"
              />
            </div>
          </slot>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCreateRoom = false">
            取消
          </button>
          <button class="btn-primary" @click="createRoom" :disabled="loading">
            创建房间
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '多人游戏大厅'
  },
  playerNamePlaceholder: {
    type: String,
    default: '输入您的昵称'
  },
  gameModes: {
    type: Array,
    default: () => [
      { value: 'shared', label: '共享模式', icon: '🤝', description: '多人协作' },
      { value: 'competitive', label: '竞技模式', icon: '⚔️', description: '玩家对战' }
    ]
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

const emit = defineEmits([
  'quickJoin',
  'createRoom', 
  'joinRoom',
  'refreshRooms',
  'showStats',
  'showLeaderboard',
  'clearError'
]);

// 本地状态
const playerName = ref('');
const selectedMode = ref(props.gameModes[0]?.value || 'shared');
const showCreateRoom = ref(false);
const roomFilter = ref('all');
const activeRooms = ref([]);

// 房间配置
const roomConfig = ref({
  mode: selectedMode.value,
  maxPlayers: 4
});

// 计算属性
const filteredRooms = computed(() => {
  if (roomFilter.value === 'all') {
    return activeRooms.value;
  }
  return activeRooms.value.filter(room => room.status === roomFilter.value);
});

// 方法
const handleModeChange = (mode) => {
  selectedMode.value = mode;
  roomConfig.value.mode = mode;
};

const handleConfigChange = (key, value) => {
  roomConfig.value[key] = value;
};

const quickJoin = () => {
  if (playerName.value.trim()) {
    emit('quickJoin', {
      playerName: playerName.value.trim(),
      mode: selectedMode.value
    });
  }
};

const createRoom = () => {
  if (playerName.value.trim()) {
    emit('createRoom', {
      playerName: playerName.value.trim(),
      ...roomConfig.value
    });
    showCreateRoom.value = false;
  }
};

const joinRoom = (roomCode) => {
  if (playerName.value.trim()) {
    emit('joinRoom', {
      playerName: playerName.value.trim(),
      roomCode
    });
  }
};

const refreshRooms = () => {
  emit('refreshRooms');
};

const clearError = () => {
  emit('clearError');
};

const getStatusText = (status) => {
  const statusMap = {
    waiting: '等待中',
    playing: '游戏中',
    finished: '已结束'
  };
  return statusMap[status] || status;
};

const getModeText = (mode) => {
  const modeItem = props.gameModes.find(m => m.value === mode);
  return modeItem ? `${modeItem.icon} ${modeItem.label}` : mode;
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

// 生命周期
onMounted(() => {
  refreshRooms();
});

// 暴露给父组件
defineExpose({
  setActiveRooms: (rooms) => {
    activeRooms.value = rooms;
  },
  getPlayerName: () => playerName.value,
  getSelectedMode: () => selectedMode.value
});
</script>

<style scoped>
.multiplayer-lobby {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.lobby-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.quick-start-section, .rooms-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.quick-start-controls {
  display: grid;
  gap: 15px;
}

.player-name-input {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
}

.game-mode-selector {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.mode-option {
  display: block;
  padding: 10px 15px;
  border: 2px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-option:hover {
  border-color: #007bff;
  background-color: #f0f8ff;
}

.quick-start-buttons {
  display: flex;
  gap: 10px;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.room-card {
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.room-code {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}

.mode-badge, .status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.mode-shared { background-color: #28a745; color: white; }
.mode-competitive { background-color: #dc3545; color: white; }

.status-waiting { background-color: #28a745; color: white; }
.status-playing { background-color: #ffc107; color: black; }
.status-finished { background-color: #6c757d; color: white; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* 按钮样式 */
.btn-primary, .btn-secondary, .btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  position: relative;
}

.close-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}

.connection-status, .loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-rooms {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.filter-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
</style>
