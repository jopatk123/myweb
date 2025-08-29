<template>
  <div class="snake-room">
    <!-- 房间头部 -->
    <div class="room-header">
      <div class="room-info">
        <h2>🏠 房间 {{ currentRoom?.room_code }}</h2>
        <div class="room-details">
          <span class="mode-badge" :class="`mode-${currentRoom?.mode}`">
            {{ currentRoom?.mode === 'shared' ? '🤝 共享模式' : '⚔️ 竞技模式' }}
          </span>
          <span class="status-badge" :class="`status-${gameStatus}`">
            {{ getStatusText(gameStatus) }}
          </span>
        </div>
      </div>
      <div class="room-actions">
        <button class="btn-secondary" @click="copyRoomCode">
          📋 复制房间码
        </button>
        <button class="btn-danger" @click="leaveRoom">
          🚪 离开房间
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      ⚠️ {{ error }}
      <button @click="error = null" class="close-btn">&times;</button>
    </div>

    <!-- 游戏进行中 -->
    <div v-if="gameStatus === 'playing'" class="game-panel-wrapper">
      <div v-if="currentRoom?.mode==='shared'" class="shared-wrapper">
        <SharedGamePanel :game-state="gameState" :vote-countdown="voteTimeout" :my-vote="myVote" @vote="handleVote" />
        <VotersDisplay :votes="votes" class="mt-12" />
      </div>
      <div v-else class="competitive-wrapper">
        <CompetitiveGamePanel :game-state="gameState" @move="handleMove" />
      </div>
    </div>

    <!-- 等待室 -->
    <div v-else class="waiting-room">
      <div class="room-grid">
        <!-- 玩家列表 -->
        <div class="players-section">
          <div class="section-header">
            <h3>👥 玩家列表 ({{ players.length }}/{{ currentRoom?.max_players }})</h3>
            <div class="ready-status">
              {{ readyCount }}/{{ players.length }} 准备就绪
            </div>
          </div>

          <div class="players-list">
            <div 
              v-for="player in players" 
              :key="player.session_id"
              class="player-card"
              :class="{ 
                'is-me': player.session_id === currentPlayer?.session_id,
                'is-ready': player.is_ready,
                'is-host': currentRoom?.created_by === player.session_id
              }"
            >
              <div 
                class="player-avatar"
                :style="{ backgroundColor: player.player_color }"
              >
                {{ player.player_name.charAt(0).toUpperCase() }}
              </div>
              
              <div class="player-info">
                <div class="player-name">
                  {{ player.player_name }}
                  <span v-if="currentRoom?.created_by === player.session_id" class="host-badge">👑</span>
                  <span v-if="player.session_id === currentPlayer?.session_id" class="me-badge">我</span>
                </div>
                <div class="player-stats">
                  加入于 {{ formatTime(player.joined_at) }}
                </div>
              </div>

              <div class="player-status">
                <div v-if="player.is_ready" class="ready-indicator">
                  ✅ 准备就绪
                </div>
                <div v-else class="not-ready-indicator">
                  ⏳ 未准备
                </div>
              </div>
            </div>
          </div>

          <!-- 准备按钮 -->
          <div class="ready-controls">
            <button 
              class="ready-btn"
              :class="{ 'ready': isReady, 'not-ready': !isReady }"
              @click="toggleReady"
              :disabled="loading || gameStatus === 'starting'"
            >
              {{ isReady ? '✅ 取消准备' : '⏳ 准备游戏' }}
            </button>
            
            <div v-if="canStart && gameStatus === 'starting'" class="starting-countdown">
              🎮 游戏即将开始...
            </div>
          </div>
        </div>

        <!-- 游戏说明 -->
        <div class="game-rules-section">
          <div class="section-header">
            <h3>📖 游戏说明</h3>
          </div>

          <div class="rules-content">
            <div v-if="currentRoom?.mode === 'shared'" class="shared-rules">
              <h4>🤝 共享模式规则</h4>
              <ul>
                <li>所有玩家共同控制一条蛇</li>
                <li>每轮有3秒时间投票选择移动方向</li>
                <li>得票最多的方向获胜，平票时随机选择</li>
                <li>任何玩家都可以投票，未投票视为弃权</li>
                <li>撞墙或撞到自己即游戏结束</li>
                <li>目标是获得尽可能高的分数</li>
              </ul>
            </div>

            <div v-else class="competitive-rules">
              <h4>⚔️ 竞技模式规则</h4>
              <ul>
                <li>每个玩家控制自己的蛇，最多2人对战</li>
                <li>使用方向键或WASD控制蛇的移动</li>
                <li>吃到食物可以增长蛇身并获得分数</li>
                <li>撞墙、撞到自己或其他蛇即失败</li>
                <li>最后存活或分数最高的玩家获胜</li>
                <li>游戏时长不超过5分钟</li>
              </ul>
            </div>

            <div class="control-tips">
              <h4>🎮 操作提示</h4>
              <div class="controls-grid">
                <div class="control-group">
                  <strong>方向键</strong>
                  <div>↑ ↓ ← → 或 WASD</div>
                </div>
                <div v-if="currentRoom?.mode === 'shared'" class="control-group">
                  <strong>投票</strong>
                  <div>点击方向按钮进行投票</div>
                </div>
                <div class="control-group">
                  <strong>暂停</strong>
                  <div>空格键暂停/继续</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 房间设置 -->
        <div class="room-settings-section">
          <div class="section-header">
            <h3>⚙️ 房间设置</h3>
          </div>

          <div class="settings-content">
            <div class="setting-item">
              <label>游戏板大小</label>
              <span>{{ currentRoom?.game_settings?.board_size || 20 }} x {{ currentRoom?.game_settings?.board_size || 20 }}</span>
            </div>
            
            <div class="setting-item">
              <label>游戏速度</label>
              <span>{{ currentRoom?.game_settings?.game_speed || 150 }}ms</span>
            </div>

            <div v-if="currentRoom?.mode === 'shared'" class="setting-item">
              <label>投票时间</label>
              <span>{{ (currentRoom?.game_settings?.vote_timeout || 3000) / 1000 }}秒</span>
            </div>

            <div class="setting-item">
              <label>最大玩家数</label>
              <span>{{ currentRoom?.max_players || 8 }}人</span>
            </div>

            <div class="setting-item">
              <label>房间创建时间</label>
              <span>{{ formatTime(currentRoom?.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 邀请朋友 -->
      <div class="invite-section">
        <div class="invite-card">
          <h4>📢 邀请朋友</h4>
          <p>分享房间码给朋友，让他们加入游戏：</p>
          <div class="invite-code">
            <code>{{ currentRoom?.room_code }}</code>
            <button class="btn-copy" @click="copyRoomCode" title="复制房间码">
              📋
            </button>
          </div>
          <div class="invite-link">
            <input 
              ref="inviteLinkInput"
              :value="inviteLink" 
              readonly 
              class="invite-input"
              @click="selectInviteLink"
            />
            <button class="btn-copy" @click="copyInviteLink" title="复制邀请链接">
              🔗
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useSnakeMultiplayer } from '../../composables/useSnakeMultiplayer.js';
import { SharedGamePanel, CompetitiveGamePanel, VotersDisplay } from '@/components/multiplayer';

const emit = defineEmits(['leaveRoom']);

// 使用多人游戏组合式函数
const { 
  currentRoom,
  currentPlayer,
  players,
  gameState,
  gameStatus,
  isReady,
  canStart,
  error,
  loading,
  toggleReady,
  vote,
  move,
  leaveRoom: leaveRoomAction,
  votes,
  voteTimeout,
  myVote
} = useSnakeMultiplayer();

const inviteLinkInput = ref(null);

// 计算属性
const readyCount = computed(() => 
  players.value.filter(p => p.is_ready).length
);

const inviteLink = computed(() => 
  `${window.location.origin}${window.location.pathname}#/snake?join=${currentRoom.value?.room_code}`
);

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'waiting': '等待开始',
    'starting': '即将开始',
    'playing': '游戏进行中',
    'finished': '游戏结束'
  };
  return statusMap[status] || status;
};

// 复制房间码
const copyRoomCode = async () => {
  if (!currentRoom.value?.room_code) return;
  
  try {
    await navigator.clipboard.writeText(currentRoom.value.room_code);
    // 可以添加一个简单的提示
    console.log('房间码已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
  }
};

// 复制邀请链接
const copyInviteLink = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    console.log('邀请链接已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
  }
};

// 选择邀请链接文本
const selectInviteLink = () => {
  if (inviteLinkInput.value) {
    inviteLinkInput.value.select();
  }
};

// 离开房间
const leaveRoom = () => {
  if (confirm('确定要离开房间吗？')) {
    leaveRoomAction();
    emit('leaveRoom');
  }
};

// 处理投票（共享模式）
const handleVote = (direction) => {
  vote(direction);
};

// 处理移动（竞技模式）
const handleMove = (direction) => {
  move(direction);
};

// 处理游戏结束
const handleGameOver = (result) => {
  console.log('游戏结束:', result);
  // 这里可以显示游戏结果
};
</script>

<style scoped>
.snake-room {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 房间头部 */
.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 25px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  color: white;
}

.room-info h2 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 600;
}

.room-details {
  display: flex;
  gap: 12px;
}

.mode-badge, .status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.mode-shared {
  background: rgba(255, 255, 255, 0.2);
}

.mode-competitive {
  background: rgba(255, 255, 255, 0.2);
}

.status-waiting {
  background: rgba(255, 193, 7, 0.2);
}

.status-starting {
  background: rgba(40, 167, 69, 0.2);
}

.status-playing {
  background: rgba(40, 167, 69, 0.3);
}

.room-actions {
  display: flex;
  gap: 12px;
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

/* 等待室 */
.waiting-room {
  display: grid;
  gap: 30px;
}

.room-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 30px;
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
  font-size: 18px;
}

.ready-status {
  color: #666;
  font-size: 14px;
}

/* 玩家列表 */
.players-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
}

.player-card {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 2px solid #e1e8ed;
  border-radius: 12px;
  transition: all 0.3s;
  background: white;
}

.player-card.is-me {
  border-color: #667eea;
  background: #f8f9ff;
}

.player-card.is-ready {
  border-color: #2ed573;
  background: #f0fff4;
}

.player-card.is-host {
  background: #fff8e7;
  border-color: #ffa502;
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
  margin-right: 15px;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.host-badge, .me-badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.host-badge {
  background: #ffeaa7;
  color: #b8860b;
}

.me-badge {
  background: #ddd6fe;
  color: #7c3aed;
}

.player-stats {
  color: #666;
  font-size: 14px;
}

.player-status {
  text-align: right;
}

.ready-indicator {
  color: #2ed573;
  font-weight: 500;
  font-size: 14px;
}

.not-ready-indicator {
  color: #ffa502;
  font-weight: 500;
  font-size: 14px;
}

.ready-controls {
  text-align: center;
}

.ready-btn {
  padding: 15px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 150px;
}

.ready-btn.ready {
  background: #2ed573;
  color: white;
}

.ready-btn.ready:hover:not(:disabled) {
  background: #26c65b;
  transform: translateY(-1px);
}

.ready-btn.not-ready {
  background: #ffa502;
  color: white;
}

.ready-btn.not-ready:hover:not(:disabled) {
  background: #ff9500;
  transform: translateY(-1px);
}

.starting-countdown {
  margin-top: 15px;
  color: #2ed573;
  font-weight: 600;
  font-size: 16px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

/* 游戏说明 */
.game-rules-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.rules-content h4 {
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 16px;
}

.rules-content ul {
  margin: 0 0 20px 0;
  padding-left: 20px;
}

.rules-content li {
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
  line-height: 1.5;
}

.control-tips h4 {
  margin-top: 20px;
  margin-bottom: 15px;
}

.controls-grid {
  display: grid;
  gap: 12px;
}

.control-group {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
}

.control-group strong {
  color: #2c3e50;
}

/* 房间设置 */
.room-settings-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.settings-content {
  display: grid;
  gap: 12px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
  font-size: 14px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-weight: 500;
  color: #2c3e50;
}

.setting-item span {
  color: #666;
}

/* 邀请朋友 */
.invite-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.invite-card h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 18px;
}

.invite-card p {
  margin: 0 0 15px 0;
  color: #666;
}

.invite-code {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.invite-code code {
  background: #f8f9fa;
  padding: 10px 15px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
  letter-spacing: 2px;
  flex: 1;
  text-align: center;
}

.invite-link {
  display: flex;
  gap: 10px;
}

.invite-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  font-size: 14px;
  background: #f8f9fa;
}

.btn-copy {
  padding: 10px;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  min-width: 44px;
}

.btn-copy:hover {
  background: #f8f9fa;
  border-color: #667eea;
}

/* 按钮样式 */
.btn-secondary, .btn-danger {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-danger {
  background: #ff4757;
  color: white;
}

.btn-danger:hover {
  background: #ff3742;
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .room-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .room-settings-section {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .snake-room {
    padding: 15px;
  }
  
  .room-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .room-grid {
    grid-template-columns: 1fr;
  }
  
  .invite-link {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .room-details {
    flex-direction: column;
    gap: 8px;
  }
  
  .player-card {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .player-info, .player-status {
    text-align: center;
  }
}
</style>
