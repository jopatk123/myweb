<template>
  <div class="snake-multiplayer-game">
    <div class="game-layout" :class="`layout-${room.mode}`">
      
      <!-- 共享模式游戏区域 -->
      <div v-if="room.mode === 'shared'" class="shared-game-area">
        
        <template>
          <div class="deprecated-msg">SnakeMultiplayerGame.vue 已弃用，请使用新通用面板组件。</div>
        </template>
        <script setup>
        // Deprecated placeholder (kept to avoid broken imports during gradual migration)
        </script>
        <style scoped>
        .deprecated-msg{padding:16px;background:#fff3cd;color:#856404;border:1px solid #ffe08a;border-radius:6px;font-size:14px;}
        </style>
              >
                ⬅️ 左
                <span class="vote-count">{{ getVoteCount('left') }}</span>
              </button>
              
              <button 
                class="vote-btn vote-right"
                :class="{ 'voted': myVote === 'right', 'winning': isWinningDirection('right') }"
                @click="handleVote('right')"
                :disabled="voteTimeout <= 0"
              >
                ➡️ 右
                <span class="vote-count">{{ getVoteCount('right') }}</span>
              </button>
            </div>
            
            <button 
              class="vote-btn vote-down"
              :class="{ 'voted': myVote === 'down', 'winning': isWinningDirection('down') }"
              @click="handleVote('down')"
              :disabled="voteTimeout <= 0"
            >
              ⬇️ 下
              <span class="vote-count">{{ getVoteCount('down') }}</span>
            </button>
          </div>

          <!-- 投票玩家显示 -->
          <div class="voters-display">
            <div 
              v-for="(vote, sessionId) in votes" 
              :key="sessionId"
              class="voter-info"
              :style="{ color: vote.player_color }"
            >
              {{ vote.player_name }} 投票: {{ getDirectionText(vote.direction) }}
            </div>
          </div>
        </div>

        <!-- 游戏画布 -->
        <div class="game-canvas-container">
          <SnakeCanvas
            ref="sharedCanvas"
            :board-size="400"
            :cell="20"
            :snake="gameState?.sharedSnake?.body || []"
            :food="gameState?.food"
            :grid-size="20"
            class="shared-canvas"
          />
        </div>
      </div>

      <!-- 竞技模式游戏区域 -->
      <div v-else-if="room.mode === 'competitive'" class="competitive-game-area">
        
        <!-- 玩家游戏区域 -->
        <div class="players-games">
          <div 
            v-for="gamePlayer in gamePlayers" 
            :key="gamePlayer.session_id"
            class="player-game"
            :class="{ 'is-me': gamePlayer.session_id === player.session_id }"
          >
            <!-- 玩家信息 -->
            <div class="player-game-header">
              <div 
                class="player-indicator"
                :style="{ backgroundColor: gamePlayer.player_color }"
              >
                {{ gamePlayer.player_name.charAt(0).toUpperCase() }}
              </div>
              <div class="player-game-info">
                <div class="player-game-name">{{ gamePlayer.player_name }}</div>
                <div class="player-game-stats">
                  分数: {{ getPlayerSnake(gamePlayer.session_id)?.score || 0 }} | 
                  长度: {{ getPlayerSnake(gamePlayer.session_id)?.length || 3 }}
                </div>
              </div>
              <div class="player-game-status">
                <span 
                  v-if="getPlayerSnake(gamePlayer.session_id)?.gameOver"
                  class="game-over-indicator"
                >
                  💀 游戏结束
                </span>
                <span v-else class="alive-indicator">🟢 存活</span>
              </div>
            </div>

            <!-- 游戏画布 -->
            <div class="player-canvas-container">
              <SnakeCanvas
                :ref="`canvas-${gamePlayer.session_id}`"
                :board-size="300"
                :cell="15"
                :snake="getPlayerSnake(gamePlayer.session_id)?.body || []"
                :food="gameState?.food?.[gamePlayer.session_id]"
                :grid-size="20"
                :game-over="getPlayerSnake(gamePlayer.session_id)?.gameOver || false"
                class="competitive-canvas"
              />
            </div>
          </div>
        </div>

        <!-- 控制提示 -->
        <div class="control-hints">
          <h4>🎮 控制提示</h4>
          <div class="controls">
            <div class="control-key">WASD</div>
            <div class="control-or">或</div>
            <div class="control-key">方向键</div>
            <div class="control-desc">控制蛇的移动</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏结束覆盖层 -->
    <div v-if="gameState?.gameOver" class="game-over-overlay">
      <div class="game-over-modal">
        <h2>🎮 游戏结束</h2>
        
        <div v-if="room.mode === 'shared'" class="shared-result">
          <div class="final-score">
            <span class="score-label">最终分数</span>
            <span class="score-value">{{ gameState?.sharedSnake?.score || 0 }}</span>
          </div>
          
          <div class="final-length">
            <span class="length-label">最终长度</span>
            <span class="length-value">{{ gameState?.sharedSnake?.length || 3 }}</span>
          </div>
          
          <div class="participants">
            <h4>参与玩家</h4>
            <div class="participant-list">
              <div 
                v-for="gamePlayer in players" 
                :key="gamePlayer.session_id"
                class="participant"
                :style="{ color: gamePlayer.player_color }"
              >
                {{ gamePlayer.player_name }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="competitive-result">
          <div v-if="gameState?.winner" class="winner-display">
            <div class="winner-icon">🏆</div>
            <div class="winner-info">
              <div class="winner-name">{{ gameState.winner.player_name }}</div>
              <div class="winner-score">获胜分数: {{ getPlayerSnake(gameState.winner.session_id)?.score || 0 }}</div>
            </div>
          </div>
          
          <div class="final-standings">
            <h4>最终排名</h4>
            <div class="standings-list">
              <div 
                v-for="(gamePlayer, index) in sortedPlayers" 
                :key="gamePlayer.session_id"
                class="standing-item"
              >
                <span class="rank">{{ index + 1 }}</span>
                <span 
                  class="player-name"
                  :style="{ color: gamePlayer.player_color }"
                >
                  {{ gamePlayer.player_name }}
                </span>
                <span class="player-score">{{ getPlayerSnake(gamePlayer.session_id)?.score || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="game-over-actions">
          <button class="btn-primary" @click="$emit('gameOver', gameState)">
            返回房间
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import SnakeCanvas from './SnakeCanvas.vue';

const props = defineProps({
  room: {
    type: Object,
    required: true
  },
  player: {
    type: Object,
    required: true
  },
  players: {
    type: Array,
    required: true
  },
  gameState: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['vote', 'move', 'gameOver']);

const sharedCanvas = ref(null);
const votes = ref({});
const myVote = ref(null);
const voteTimeout = ref(0);
const voteTimer = ref(null);

// 计算属性
const gamePlayers = computed(() => 
  props.players.filter(p => props.gameState?.snakes?.[p.session_id])
);

const sortedPlayers = computed(() => {
  return [...gamePlayers.value].sort((a, b) => {
    const scoreA = getPlayerSnake(a.session_id)?.score || 0;
    const scoreB = getPlayerSnake(b.session_id)?.score || 0;
    return scoreB - scoreA;
  });
});

// 获取玩家的蛇数据
const getPlayerSnake = (sessionId) => {
  return props.gameState?.snakes?.[sessionId];
};

// 获取投票数量
const getVoteCount = (direction) => {
  return Object.values(votes.value).filter(vote => vote.direction === direction).length;
};

// 检查是否是获胜方向
const isWinningDirection = (direction) => {
  const counts = {
    up: getVoteCount('up'),
    down: getVoteCount('down'),
    left: getVoteCount('left'),
    right: getVoteCount('right')
  };
  
  const maxCount = Math.max(...Object.values(counts));
  return maxCount > 0 && counts[direction] === maxCount;
};

// 获取方向文本
const getDirectionText = (direction) => {
  const directionMap = {
    up: '上',
    down: '下',
    left: '左',
    right: '右'
  };
  return directionMap[direction] || direction;
};

// 处理投票
const handleVote = (direction) => {
  if (voteTimeout.value <= 0) return;
  
  myVote.value = direction;
  emit('vote', direction);
};

// 处理键盘输入
const handleKeyPress = (event) => {
  if (props.room.mode === 'shared') {
    // 共享模式：方向键用于投票
    const keyMap = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'KeyW': 'up',
      'KeyS': 'down',
      'KeyA': 'left',
      'KeyD': 'right'
    };
    
    const direction = keyMap[event.code];
    if (direction && voteTimeout.value > 0) {
      handleVote(direction);
    }
  } else if (props.room.mode === 'competitive') {
    // 竞技模式：方向键用于移动
    const keyMap = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'KeyW': 'up',
      'KeyS': 'down',
      'KeyA': 'left',
      'KeyD': 'right'
    };
    
    const direction = keyMap[event.code];
    if (direction) {
      emit('move', direction);
    }
  }
};

// 启动投票倒计时
const startVoteCountdown = () => {
  voteTimeout.value = 3;
  voteTimer.value = setInterval(() => {
    voteTimeout.value--;
    if (voteTimeout.value <= 0) {
      clearInterval(voteTimer.value);
      voteTimer.value = null;
      myVote.value = null;
    }
  }, 1000);
};

// 生命周期钩子
onMounted(() => {
  // 监听键盘事件
  document.addEventListener('keydown', handleKeyPress);
  
  // 如果是共享模式，启动投票倒计时
  if (props.room.mode === 'shared') {
    startVoteCountdown();
  }
});

onUnmounted(() => {
  // 清理事件监听器和定时器
  document.removeEventListener('keydown', handleKeyPress);
  
  if (voteTimer.value) {
    clearInterval(voteTimer.value);
  }
});

// 监听游戏状态更新
// 这里可以根据实际的游戏状态更新逻辑来调整
</script>

<style scoped>
.snake-multiplayer-game {
  position: relative;
  min-height: 600px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 游戏布局 */
.game-layout {
  display: grid;
  gap: 20px;
  height: 100%;
}

.layout-shared {
  grid-template-columns: 1fr 400px;
}

.layout-competitive {
  grid-template-columns: 1fr;
}

/* 共享模式样式 */
.shared-game-area {
  display: grid;
  gap: 20px;
  grid-template-rows: auto auto 1fr;
}

.game-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.score-display, .length-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.score-label, .length-label, .timer-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.score-value {
  color: #667eea;
  font-size: 24px;
  font-weight: bold;
}

.length-value {
  color: #2ed573;
  font-size: 24px;
  font-weight: bold;
}

.vote-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.timer-value {
  color: #ffa502;
  font-size: 20px;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* 投票区域 */
.voting-area {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.voting-area h4 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  text-align: center;
}

.vote-buttons {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 10px;
  max-width: 200px;
  margin: 0 auto 20px;
}

.vote-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.vote-up, .vote-down {
  justify-self: center;
  width: 80px;
}

.vote-btn {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  font-weight: 500;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.vote-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f8f9ff;
}

.vote-btn.voted {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.vote-btn.winning {
  border-color: #2ed573;
  background: #f0fff4;
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vote-count {
  font-size: 12px;
  font-weight: bold;
  opacity: 0.8;
}

.voters-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 100px;
  overflow-y: auto;
}

.voter-info {
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

/* 游戏画布容器 */
.game-canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.shared-canvas {
  border: 2px solid #e1e8ed;
  border-radius: 8px;
}

/* 竞技模式样式 */
.competitive-game-area {
  display: grid;
  gap: 20px;
}

.players-games {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.player-game {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.player-game.is-me {
  border: 2px solid #667eea;
}

.player-game-header {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  gap: 15px;
}

.player-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.player-game-info {
  flex: 1;
}

.player-game-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.player-game-stats {
  color: #666;
  font-size: 14px;
}

.player-game-status {
  text-align: right;
}

.game-over-indicator {
  color: #ff4757;
  font-weight: 500;
  font-size: 14px;
}

.alive-indicator {
  color: #2ed573;
  font-weight: 500;
  font-size: 14px;
}

.player-canvas-container {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.competitive-canvas {
  border: 1px solid #e1e8ed;
  border-radius: 4px;
}

/* 控制提示 */
.control-hints {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.control-hints h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.control-key {
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  font-family: monospace;
  font-weight: bold;
  color: #2c3e50;
}

.control-or {
  color: #666;
  font-style: italic;
}

.control-desc {
  color: #666;
}

/* 游戏结束覆盖层 */
.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.game-over-modal {
  background: white;
  border-radius: 15px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.game-over-modal h2 {
  margin: 0 0 30px 0;
  color: #2c3e50;
  font-size: 28px;
}

/* 共享模式结果 */
.shared-result {
  display: grid;
  gap: 20px;
  margin-bottom: 30px;
}

.final-score, .final-length {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.score-label, .length-label {
  font-weight: 500;
  color: #2c3e50;
}

.score-value {
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
}

.length-value {
  font-size: 20px;
  font-weight: bold;
  color: #2ed573;
}

.participants h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.participant-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
}

.participant {
  font-weight: 500;
  padding: 5px 10px;
  background: #f8f9fa;
  border-radius: 15px;
}

/* 竞技模式结果 */
.competitive-result {
  margin-bottom: 30px;
}

.winner-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f0fff4;
  border-radius: 12px;
}

.winner-icon {
  font-size: 48px;
}

.winner-info {
  text-align: left;
}

.winner-name {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
}

.winner-score {
  color: #666;
  font-size: 16px;
}

.final-standings h4 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.standings-list {
  display: grid;
  gap: 10px;
}

.standing-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.rank {
  font-weight: bold;
  color: #2c3e50;
  min-width: 30px;
}

.player-name {
  flex: 1;
  font-weight: 500;
  text-align: left;
  margin-left: 15px;
}

.player-score {
  font-weight: bold;
  color: #667eea;
}

/* 按钮 */
.game-over-actions {
  display: flex;
  justify-content: center;
}

.btn-primary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #667eea;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .layout-shared {
    grid-template-columns: 1fr;
  }
  
  .shared-game-area {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .game-info-bar {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .shared-game-area {
    grid-template-columns: 1fr;
  }
  
  .game-info-bar {
    grid-column: span 1;
    flex-direction: column;
    gap: 15px;
  }
  
  .players-games {
    grid-template-columns: 1fr;
  }
  
  .game-over-modal {
    padding: 20px;
  }
  
  .winner-display {
    flex-direction: column;
    text-align: center;
  }
  
  .winner-info {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .vote-buttons {
    max-width: 150px;
  }
  
  .vote-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .controls {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
