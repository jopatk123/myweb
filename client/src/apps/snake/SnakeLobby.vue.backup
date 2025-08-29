<template>
  <div class="snake-lobby">
    <!-- 头部导航 -->
    <div class="lobby-header">
      <h2>🐍 多人贪吃蛇</h2>
      <div class="header-actions">
        <button class="btn-secondary" @click="showStats = true">
          📊 统计信息
        </button>
        <button class="btn-secondary" @click="showLeaderboard = true">
          🏆 排行榜
        </button>
        <button class="btn-secondary" @click="refreshRooms" :disabled="loading">
          🔄 刷新房间
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      ⚠️ {{ error }}
      <button @click="error = null" class="close-btn">&times;</button>
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
            placeholder="输入您的昵称"
            maxlength="20"
            class="player-name-input"
            @keyup.enter="quickJoin"
          />
          
          <div class="game-mode-selector">
            <label>
              <input v-model="selectedMode" type="radio" value="shared" />
              <span class="mode-option">
                🤝 共享模式
                <small>多人控制一条蛇</small>
              </span>
            </label>
            <label>
              <input v-model="selectedMode" type="radio" value="competitive" />
              <span class="mode-option">
                ⚔️ 竞技模式
                <small>双人对战</small>
              </span>
            </label>
          </div>

          <div class="quick-actions">
            <button 
              class="btn-primary" 
              @click="createNewRoom"
              :disabled="!playerName.trim() || loading"
            >
              🎮 创建房间
            </button>
            <button 
              class="btn-secondary" 
              @click="quickJoin"
              :disabled="!playerName.trim() || loading"
            >
              🚀 快速加入
            </button>
          </div>
        </div>
      </div>

      <!-- 加入指定房间 -->
      <div class="join-room-section">
        <h3>加入房间</h3>
        <div class="join-room-controls">
          <input
            v-model="roomCodeInput"
            type="text"
            placeholder="输入房间码（如：ABC123）"
            maxlength="10"
            class="room-code-input"
            @keyup.enter="joinSpecificRoom"
            @input="roomCodeInput = roomCodeInput.toUpperCase()"
          />
          <button 
            class="btn-primary" 
            @click="joinSpecificRoom"
            :disabled="!playerName.trim() || !roomCodeInput.trim() || loading"
          >
            🔗 加入房间
          </button>
        </div>
      </div>

      <!-- 活跃房间列表 -->
      <div class="active-rooms-section">
        <div class="section-header">
          <h3>活跃房间 ({{ activeRooms.length }})</h3>
          <button class="btn-text" @click="refreshRooms" :disabled="loading">
            {{ loading ? '刷新中...' : '刷新' }}
          </button>
        </div>

        <div v-if="loading && !activeRooms.length" class="loading-placeholder">
          <div class="loading-spinner"></div>
          <span>加载房间列表...</span>
        </div>

        <div v-else-if="!activeRooms.length" class="empty-rooms">
          <div class="empty-icon">🏠</div>
          <p>暂无活跃房间</p>
          <p class="empty-hint">创建一个房间来开始游戏吧！</p>
        </div>

        <div v-else class="rooms-grid">
          <div 
            v-for="room in activeRooms" 
            :key="room.id"
            class="room-card"
            :class="{ 
              'room-full': room.current_players >= room.max_players,
              'room-playing': room.status === 'playing'
            }"
          >
            <div class="room-header">
              <span class="room-code">{{ room.room_code }}</span>
              <span class="room-mode" :class="`mode-${room.mode}`">
                {{ room.mode === 'shared' ? '🤝 共享' : '⚔️ 竞技' }}
              </span>
            </div>

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

            <div class="room-players">
              <div 
                v-for="player in room.players.slice(0, 4)" 
                :key="player.id"
                class="player-avatar"
                :style="{ backgroundColor: player.player_color }"
                :title="player.player_name"
              >
                {{ player.player_name.charAt(0).toUpperCase() }}
                <span v-if="player.is_ready" class="ready-indicator">✓</span>
              </div>
              <div v-if="room.players.length > 4" class="more-players">
                +{{ room.players.length - 4 }}
              </div>
            </div>

            <div class="room-actions">
              <button 
                v-if="room.status === 'waiting' && room.current_players < room.max_players"
                class="btn-join"
                @click="joinRoomById(room.room_code)"
                :disabled="!playerName.trim() || loading"
              >
                🚪 加入
              </button>
              <button 
                v-else-if="room.status === 'playing'"
                class="btn-spectate"
                @click="spectateRoom(room.room_code)"
                :disabled="loading"
              >
                👁️ 观战
              </button>
              <button 
                v-else
                class="btn-disabled"
                disabled
              >
                {{ room.current_players >= room.max_players ? '已满' : '游戏中' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计信息弹窗 -->
    <div v-if="showStats" class="modal-overlay" @click.self="showStats = false">
      <div class="modal-content stats-modal">
        <div class="modal-header">
          <h3>📊 我的统计</h3>
          <button class="modal-close" @click="showStats = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="playerStats" class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ playerStats.total_games }}</div>
              <div class="stat-label">总游戏数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ playerStats.wins }}</div>
              <div class="stat-label">胜利次数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ (playerStats.win_rate * 100).toFixed(1) }}%</div>
              <div class="stat-label">胜率</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ playerStats.best_score }}</div>
              <div class="stat-label">最高分</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ playerStats.avg_score }}</div>
              <div class="stat-label">平均分</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ Math.floor(playerStats.avg_duration / 60) }}:{{ String(playerStats.avg_duration % 60).padStart(2, '0') }}</div>
              <div class="stat-label">平均时长</div>
            </div>
          </div>
          <div v-else class="no-stats">
            <p>暂无游戏统计数据</p>
            <p class="hint">开始一场游戏来获得统计信息吧！</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 排行榜弹窗 -->
    <div v-if="showLeaderboard" class="modal-overlay" @click.self="showLeaderboard = false">
      <div class="modal-content leaderboard-modal">
        <div class="modal-header">
          <h3>🏆 排行榜</h3>
          <button class="modal-close" @click="showLeaderboard = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="leaderboard-tabs">
            <button 
              class="tab-btn" 
              :class="{ active: leaderboardMode === 'all' }"
              @click="switchLeaderboardMode('all')"
            >
              全部
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: leaderboardMode === 'shared' }"
              @click="switchLeaderboardMode('shared')"
            >
              共享模式
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: leaderboardMode === 'competitive' }"
              @click="switchLeaderboardMode('competitive')"
            >
              竞技模式
            </button>
          </div>

          <div v-if="leaderboard.length" class="leaderboard-list">
            <div 
              v-for="(player, index) in leaderboard" 
              :key="player.session_id"
              class="leaderboard-item"
              :class="{ 'is-me': player.session_id === currentSessionId }"
            >
              <div class="rank">
                <span v-if="index < 3" class="medal">{{ ['🥇', '🥈', '🥉'][index] }}</span>
                <span v-else class="rank-number">{{ index + 1 }}</span>
              </div>
              <div class="player-info">
                <div class="player-name">{{ player.player_name }}</div>
                <div class="player-details">
                  {{ player.wins }} 胜 · 最高 {{ player.best_score }} 分 · 平均 {{ player.avg_score }} 分
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-leaderboard">
            <p>暂无排行榜数据</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSnakeMultiplayer } from '../../composables/useSnakeMultiplayer.js';
import { snakeMultiplayerApi } from '../../api/snake-multiplayer.js';

const emit = defineEmits(['joinRoom', 'createRoom']);

// 使用多人游戏组合式函数
const { 
  isConnected, 
  error, 
  loading,
  createRoom,
  joinRoom,
  init
} = useSnakeMultiplayer();

// 本地状态
const playerName = ref(localStorage.getItem('snakePlayerName') || '');
const selectedMode = ref('shared');
const roomCodeInput = ref('');
const activeRooms = ref([]);
const showStats = ref(false);
const showLeaderboard = ref(false);
const playerStats = ref(null);
const leaderboard = ref([]);
const leaderboardMode = ref('all');
const currentSessionId = ref(localStorage.getItem('sessionId'));

// 监听玩家名字变化，保存到本地存储
watch(playerName, (newName) => {
  localStorage.setItem('snakePlayerName', newName);
});

// 加载活跃房间
const refreshRooms = async () => {
  try {
    activeRooms.value = await snakeMultiplayerApi.getActiveRooms();
  } catch (err) {
    console.error('刷新房间失败:', err);
  }
};

// 创建新房间
const createNewRoom = async () => {
  if (!playerName.value.trim()) return;
  
  try {
    await createRoom(playerName.value.trim(), selectedMode.value);
    emit('createRoom');
  } catch (err) {
    console.error('创建房间失败:', err);
  }
};

// 快速加入房间
const quickJoin = async () => {
  if (!playerName.value.trim()) return;
  
  // 找到合适的房间
  const suitableRoom = activeRooms.value.find(room => 
    room.status === 'waiting' && 
    room.mode === selectedMode.value &&
    room.current_players < room.max_players
  );
  
  if (suitableRoom) {
    await joinRoomById(suitableRoom.room_code);
  } else {
    // 没有合适的房间，创建新房间
    await createNewRoom();
  }
};

// 加入指定房间
const joinSpecificRoom = async () => {
  if (!playerName.value.trim() || !roomCodeInput.value.trim()) return;
  
  try {
    await joinRoom(playerName.value.trim(), roomCodeInput.value.trim());
    emit('joinRoom');
  } catch (err) {
    console.error('加入房间失败:', err);
  }
};

// 通过房间码加入房间
const joinRoomById = async (roomCode) => {
  if (!playerName.value.trim()) return;
  
  try {
    await joinRoom(playerName.value.trim(), roomCode);
    emit('joinRoom');
  } catch (err) {
    console.error('加入房间失败:', err);
  }
};

// 观战房间
const spectateRoom = (roomCode) => {
  // TODO: 实现观战功能
  console.log('观战房间:', roomCode);
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'waiting': '等待中',
    'playing': '游戏中',
    'finished': '已结束'
  };
  return statusMap[status] || status;
};

// 加载统计信息
const loadPlayerStats = async () => {
  try {
    playerStats.value = await snakeMultiplayerApi.getPlayerStats();
  } catch (err) {
    console.error('加载统计信息失败:', err);
    playerStats.value = null;
  }
};

// 加载排行榜
const loadLeaderboard = async (mode = null) => {
  try {
    leaderboard.value = await snakeMultiplayerApi.getLeaderboard(mode);
  } catch (err) {
    console.error('加载排行榜失败:', err);
    leaderboard.value = [];
  }
};

// 切换排行榜模式
const switchLeaderboardMode = (mode) => {
  leaderboardMode.value = mode;
  const apiMode = mode === 'all' ? null : mode;
  loadLeaderboard(apiMode);
};

// 监听弹窗显示，加载数据
watch(showStats, (show) => {
  if (show) {
    loadPlayerStats();
  }
});

watch(showLeaderboard, (show) => {
  if (show) {
    loadLeaderboard();
  }
});

// 组件挂载时初始化
onMounted(async () => {
  await init();
  await refreshRooms();
  
  // 定期刷新房间列表
  setInterval(refreshRooms, 10000); // 每10秒刷新一次
});
</script>

<style scoped>
.snake-lobby {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 头部 */
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  color: white;
}

.lobby-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 错误提示 */
.error-message {
  background: #ff4757;
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 连接状态 */
.connection-status {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 主要内容区域 */
.lobby-content {
  display: grid;
  gap: 30px;
}

/* 快速开始区域 */
.quick-start-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.quick-start-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 20px;
}

.quick-start-controls {
  display: grid;
  gap: 20px;
}

.player-name-input {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.player-name-input:focus {
  outline: none;
  border-color: #667eea;
}

.game-mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.game-mode-selector label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.game-mode-selector input[type="radio"] {
  margin-right: 12px;
}

.mode-option {
  display: flex;
  flex-direction: column;
  padding: 15px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  transition: all 0.3s;
  background: white;
}

.game-mode-selector input[type="radio"]:checked + .mode-option {
  border-color: #667eea;
  background: #f8f9ff;
}

.mode-option small {
  color: #666;
  margin-top: 4px;
}

.quick-actions {
  display: flex;
  gap: 15px;
}

/* 加入房间区域 */
.join-room-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.join-room-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 20px;
}

.join-room-controls {
  display: flex;
  gap: 15px;
}

.room-code-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  font-family: monospace;
  text-transform: uppercase;
  transition: border-color 0.3s;
}

.room-code-input:focus {
  outline: none;
  border-color: #667eea;
}

/* 活跃房间区域 */
.active-rooms-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
}

.loading-placeholder {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-rooms {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-rooms p {
  margin: 10px 0;
}

.empty-hint {
  font-size: 14px;
  color: #999;
}

/* 房间网格 */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.room-card {
  border: 2px solid #e1e8ed;
  border-radius: 12px;
  padding: 20px;
  background: white;
  transition: all 0.3s;
  position: relative;
}

.room-card:hover {
  border-color: #667eea;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.room-card.room-full {
  border-color: #ffa502;
  background: #fff8e7;
}

.room-card.room-playing {
  border-color: #2ed573;
  background: #f0fff4;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.room-code {
  font-family: monospace;
  font-weight: bold;
  font-size: 18px;
  color: #2c3e50;
}

.room-mode {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.mode-shared {
  background: #e3f2fd;
  color: #1976d2;
}

.mode-competitive {
  background: #fce4ec;
  color: #c2185b;
}

.room-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.player-count {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  font-weight: bold;
  font-size: 16px;
}

.label {
  color: #666;
  font-size: 14px;
}

.room-status .status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.status-waiting {
  background: #fff3cd;
  color: #856404;
}

.status-playing {
  background: #d4edda;
  color: #155724;
}

.status-finished {
  background: #f8d7da;
  color: #721c24;
}

.room-players {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  position: relative;
}

.ready-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #2ed573;
  color: white;
  font-size: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-players {
  color: #666;
  font-size: 12px;
  margin-left: 4px;
}

.room-actions {
  display: flex;
  justify-content: flex-end;
}

/* 按钮样式 */
.btn-primary, .btn-secondary, .btn-text, .btn-join, .btn-spectate, .btn-disabled {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover:not(:disabled) {
  background: #e9ecef;
}

.btn-text {
  background: none;
  color: #667eea;
  padding: 4px 8px;
}

.btn-text:hover:not(:disabled) {
  background: #f8f9ff;
}

.btn-join {
  background: #2ed573;
  color: white;
}

.btn-join:hover:not(:disabled) {
  background: #26c65b;
}

.btn-spectate {
  background: #ffa502;
  color: white;
}

.btn-spectate:hover:not(:disabled) {
  background: #ff9500;
}

.btn-disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #e1e8ed;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modal-close:hover {
  background: #f8f9fa;
}

.modal-body {
  padding: 25px;
}

/* 统计信息样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.no-stats {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-stats .hint {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}

/* 排行榜样式 */
.leaderboard-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #e1e8ed;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  color: #666;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab-btn:hover {
  color: #667eea;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.3s;
}

.leaderboard-item.is-me {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.rank {
  width: 50px;
  text-align: center;
  margin-right: 15px;
}

.medal {
  font-size: 24px;
}

.rank-number {
  font-weight: bold;
  color: #666;
  font-size: 18px;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.player-details {
  color: #666;
  font-size: 14px;
}

.no-leaderboard {
  text-align: center;
  padding: 40px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .snake-lobby {
    padding: 15px;
  }
  
  .lobby-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .join-room-controls {
    flex-direction: column;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
  }
  
  .game-mode-selector {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>
