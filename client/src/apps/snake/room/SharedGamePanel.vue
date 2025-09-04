<template>
  <div class="shared-game-panel">
    <div class="game-canvas-area">
      <h4>🐍 共享蛇游戏</h4>
      <div class="vote-timer">
        投票倒计时: {{ voteCountdown }}s
      </div>
      
      <!-- 游戏信息 -->
      <div class="game-info">
        <div class="info-item">
          <span class="label">分数:</span>
          <span class="value">{{ gameState?.sharedSnake?.score || 0 }}</span>
        </div>
        <div class="info-item">
          <span class="label">长度:</span>
          <span class="value">{{ gameState?.sharedSnake?.length || 3 }}</span>
        </div>
        <div class="info-item" v-if="gameState?.sharedSnake?.isWaitingForFirstVote">
          <span class="waiting-text">🎯 等待投票开始游戏</span>
        </div>
      </div>
      
      <!-- 真正的游戏画布 -->
      <div class="canvas-container">
        <SnakeCanvas
          ref="snakeCanvas"
          :boardSize="BOARD_PX"
          :cell="CELL_PX"
          :snake="snake"
          :food="food"
          :specialFood="null"
          :particles="[]"
          :gridSize="GRID_SIZE"
          :gameOver="false"
        />
      </div>

      <!-- 投票按钮 -->
      <div class="vote-controls">
        <div class="vote-row">
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'up' }"
            @click="handleVote('up')"
          >
            ⬆️ 上
          </button>
        </div>
        <div class="vote-row">
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'left' }"
            @click="handleVote('left')"
          >
            ⬅️ 左
          </button>
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'right' }"
            @click="handleVote('right')"
          >
            ➡️ 右
          </button>
        </div>
        <div class="vote-row">
          <button 
            class="vote-btn"
            :class="{ active: myVote === 'down' }"
            @click="handleVote('down')"
          >
            ⬇️ 下
          </button>
        </div>
      </div>
    </div>
    <!-- 结束总结面板 -->
    <div v-if="showSummary" class="summary-overlay">
      <div class="summary-card">
        <button class="close-btn" @click="showSummary=false">✕</button>
        <h3>🎉 本局结束</h3>
        <div class="stats-grid">
          <div class="stat-item"><span class="label">最终分数</span><span class="val">{{ finalScore }}</span></div>
          <div class="stat-item"><span class="label">吃到食物</span><span class="val">{{ finalFood }}</span></div>
          <div class="stat-item"><span class="label">长度</span><span class="val">{{ finalLength }}</span></div>
          <div class="stat-item"><span class="label">耗时</span><span class="val">{{ durationSec }}s</span></div>
        </div>
        <div class="players-box" v-if="playerCount > 0">
          <div class="players-title">参与玩家 ({{ playerCount }})</div>
          <ul class="players-list">
            <li v-for="p in players" :key="p.session_id">{{ p.player_name || p.playerName || '玩家' }}</li>
          </ul>
        </div>
        <div class="actions">
          <button class="btn" @click="handleRestart">重新开始</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import SnakeCanvas from '../SnakeCanvas.vue'

const props = defineProps({
  gameState: { type: Object, required: true },
  players: { type: Array, default: () => [] },
  voteCountdown: { type: Number, default: 0 },
  myVote: { type: String, default: null }
})

const emit = defineEmits(['vote','restart'])

// 处理投票点击
const handleVote = (direction) => {
  emit('vote', direction)
}

const snakeCanvas = ref(null)
const showSummary = ref(false)
const finishedAt = ref(null)

// 汇总字段
const finalScore = computed(()=> props.gameState?.sharedSnake?.score || 0)
const finalFood = computed(()=> Math.floor(finalScore.value / 10))
const finalLength = computed(()=> props.gameState?.sharedSnake?.body?.length || props.gameState?.sharedSnake?.length || 0)
const durationSec = computed(()=> {
  const start = props.gameState?.startTime; const end = props.gameState?.endTime;
  if (!start) return 0; return Math.round(((end || Date.now()) - start)/1000)
})
const playerCount = computed(()=> props.players?.length || 0)

watch(()=> props.gameState?.status, (val, old)=>{
  if (val === 'finished') { showSummary.value = true; finishedAt.value = Date.now(); }
  if (val === 'playing') { showSummary.value = false; }
})

function handleRestart(){
  emit('restart');
  // 重开后等待新状态刷新隐藏面板
  showSummary.value = false;
}

// 画布格子/像素配置：固定单格像素，画布像素随格子数变化
const CELL_PX = 20; // 每格像素固定为 20px
const GRID_SIZE = computed(() => props.gameState?.config?.BOARD_SIZE || 25);
const BOARD_PX = computed(() => Math.max(200, Math.floor(CELL_PX * GRID_SIZE.value)));

// 计算蛇的位置数据
const snake = computed(() => {
  if (!props.gameState?.sharedSnake?.body) {
    // 默认蛇的位置
    return [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ]
  }
  return props.gameState.sharedSnake.body
})

// 计算食物位置
const food = computed(() => {
  if (!props.gameState?.food) {
    // 默认食物位置
    return { x: 15, y: 15 }
  }
  return props.gameState.food
})

// 监听游戏状态变化，重新绘制画布
watch(() => props.gameState, () => {
  nextTick(() => {
    if (snakeCanvas.value) {
      snakeCanvas.value.draw()
    }
  })
}, { deep: true })

// 监听蛇的变化，重新绘制
watch(snake, () => {
  nextTick(() => {
    if (snakeCanvas.value) {
      snakeCanvas.value.draw()
    }
  })
}, { deep: true })

// 监听食物变化，重新绘制
watch(food, () => {
  nextTick(() => {
    if (snakeCanvas.value) {
      snakeCanvas.value.draw()
    }
  })
}, { deep: true })

// 键盘支持（方向键 + WASD）
const keyMap = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right'
}
let lastVoteTick = 0;
function handleKey(e) {
  const dir = keyMap[e.key];
  if (!dir) return;
  // 防止浏览器滚动
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }
  // 简单节流：同一方向连续快速按下仍允许，但避免一帧多次
  const now = Date.now();
  if (now - lastVoteTick < 50) return;
  lastVoteTick = now;
  emit('vote', dir);
}
onMounted(() => {
  window.addEventListener('keydown', handleKey, { passive: false });
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKey);
});
</script>

<style scoped>
.shared-game-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.game-canvas-area h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.vote-timer {
  color: #ffa502;
  font-weight: bold;
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
}

.game-info {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.value {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.waiting-text {
  color: #ffa502;
  font-weight: bold;
  font-size: 14px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.canvas-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.vote-controls {
  display: grid;
  gap: 10px;
  max-width: 200px;
  margin: 0 auto;
}

.vote-row {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.vote-btn {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  min-width: 70px;
}

.vote-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f8f9ff;
}

.vote-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vote-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>

<style scoped>
.summary-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:2000; }
.summary-card { background:#ffffff; width:360px; padding:28px 26px 24px; border-radius:20px; position:relative; box-shadow:0 10px 32px rgba(0,0,0,0.25); }
.summary-card h3 { margin:0 0 18px; text-align:center; font-size:20px; }
.close-btn { position:absolute; top:10px; right:10px; border:none; background:transparent; font-size:16px; cursor:pointer; }
.stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 14px; margin-bottom:18px; }
.stat-item { background:#f8fafc; padding:10px 12px; border-radius:10px; display:flex; flex-direction:column; gap:4px; }
.stat-item .label { font-size:12px; color:#64748b; }
.stat-item .val { font-weight:600; font-size:16px; color:#1e293b; }
.actions { display:flex; justify-content:center; }
.btn { background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; padding:10px 24px; border-radius:24px; cursor:pointer; font-weight:600; letter-spacing:.5px; }
.btn:hover { filter:brightness(1.08); }
.btn:active { transform:translateY(1px); }
.players-box { background:#f1f5f9; padding:12px 14px; border-radius:12px; margin:4px 0 18px; }
.players-title { font-size:13px; font-weight:600; color:#334155; margin-bottom:6px; }
.players-list { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; font-size:12px; }
</style>
