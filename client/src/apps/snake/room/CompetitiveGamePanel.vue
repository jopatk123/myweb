<template>
  <div class="competitive-game-panel">
  <h4>⚔️ 多人竞技模式 (最多 8 人)</h4>
    
    <!-- 游戏画布区域 -->
    <div class="canvas-container">
      <SnakeCanvas
        ref="canvasRef"
        :boardSize="boardPx"
        :cell="cell"
        :gridSize="gridSize"
        :snakes="gameState?.snakes || {}"
        :snake="[]"
        :food="primaryFood"
        :foods="gameState?.foods || []"
        :specialFood="null"
        :particles="[]"
        :activeSessionId="currentPlayerId"
        :gameOver="isGameFinished"
      />
      <!-- 结束遮罩 / 总结 -->
      <div v-if="showSummary" class="finish-overlay">
        <div class="finish-card">
          <button class="close-btn" @click="showSummary=false" title="关闭">✕</button>
          <h3>🏁 对局结束</h3>
          <p v-if="loserName">失败者：<strong style="color:#ef4444">{{ loserName }}</strong></p>
          <p v-else-if="winnerName">胜者：<strong>{{ winnerName }}</strong></p>
          <p v-else>本局未产生失败者</p>
          <div class="meta-line" v-if="durationSec > 0">耗时 {{ durationSec }}s · 总分 {{ totalScore }} · 食物 {{ totalFood }}</div>
          <div class="summary-table">
            <div class="summary-header">
              <span>玩家</span><span>分数</span><span>吃到</span>
            </div>
            <div v-for="s in snakeListSorted" :key="s.player?.session_id" class="summary-row" :class="{ dead: s.gameOver }">
              <span class="player" :title="s.player?.player_name">{{ s.player?.player_name || '玩家' }}</span>
              <span>{{ s.score }}</span>
              <span>{{ s.score / 10 }}</span>
            </div>
            <div class="summary-footer">
              <span>总计</span>
              <span>{{ totalScore }}</span>
              <span>{{ totalFood }}</span>
            </div>
          </div>
          <div class="actions">
            <button class="btn" @click="handleRestartClick">重新开始</button>
          </div>
        </div>
      </div>
    </div>

    
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import SnakeCanvas from '../SnakeCanvas.vue'
const props = defineProps({
  gameState: { type: Object, required: true },
  currentPlayerId: { type: String, default: null }
});

const currentPlayerId = computed(() => props.currentPlayerId);
// 固定每格像素大小（px），画布像素随格子数量变化
const CELL_PX = 20;
const gridSize = computed(()=> props.gameState?.config?.BOARD_SIZE || 25);
const cell = computed(()=> CELL_PX);
const boardPx = computed(()=> Math.max(200, Math.floor(cell.value * gridSize.value)));
const canvasRef = ref(null);
const primaryFood = computed(() => {
  const foods = props.gameState?.foods;
  if (Array.isArray(foods) && foods.length > 0) return foods[0];
  return props.gameState?.food || { x: 0, y: 0 };
});

const snakeList = computed(() => {
  const snakes = props.gameState?.snakes || {};
  return Object.values(snakes).map((s, index) => ({ ...s, index }));
});

const snakeListSorted = computed(() => [...snakeList.value].sort((a,b)=>b.score-a.score));
const totalScore = computed(()=> snakeList.value.reduce((a,b)=>a + (b.score||0),0));
const totalFood = computed(()=> totalScore.value / 10);

const isGameFinished = computed(() => !!props.gameState?.gameOver || props.gameState?.winner || props.gameState?.loser || props.gameState?.status==='finished');
const winnerName = computed(() => props.gameState?.winner?.player_name || props.gameState?.winner?.playerName || null);
const loserName = computed(() => props.gameState?.loser?.player_name || props.gameState?.loser?.playerName || null);
const durationSec = computed(()=> { const st = props.gameState?.startTime; const et = props.gameState?.endTime; if(!st) return 0; return Math.round(((et||Date.now())-st)/1000); });

const showSummary = ref(false);
watch(isGameFinished, v=> { if (v) showSummary.value = true; });
watch(()=> props.gameState?.status, v=> { if (v==='playing') showSummary.value = false; });

function fallbackColor(i){
  return ['#4ade80','#60a5fa','#f472b6','#facc15'][i % 4];
}

const emit = defineEmits(['move','restart'])

watch(() => props.gameState, () => {
  nextTick(() => { canvasRef.value?.draw?.(); });
}, { deep: true, immediate: true });

function handleRestartClick(){
  emit('restart');
  showSummary.value = false;
}

const keyMap = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right'
}
let lastMoveTs = 0;
function handleKey(e) {
  const dir = keyMap[e.key];
  if (!dir) return;
  if ([ 'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  const now = Date.now();
  if (now - lastMoveTs < 40) return; // 简单节流
  lastMoveTs = now;
  emit('move', dir);
}
onMounted(() => window.addEventListener('keydown', handleKey, { passive: false }));
onUnmounted(() => window.removeEventListener('keydown', handleKey));
</script>

<style scoped>
.competitive-game-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.competitive-game-panel h4 {
  margin: 0;
  color: #2c3e50;
}

.canvas-placeholder {
  background: #f8f9fa;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 60px 40px;
  text-align: center;
  color: #666;
}



.canvas-container {
  position: relative;
  display: inline-block;
}


.finish-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}
.finish-card {
  background: #ffffff;
  padding: 24px 30px;
  border-radius: 16px;
  width: 260px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  color: #1e293b; /* 统一文字主色，避免全局白色主题导致看不见 */
}
.finish-card h3 { margin: 0 0 10px; font-size: 20px; color:#1e293b; }
.finish-card p { margin: 4px 0 18px; color: #475569; }
.finish-card .actions { display: flex; justify-content: center; }
.btn { background: linear-gradient(135deg,#6366f1,#4f46e5); border: none; color: #fff; padding: 8px 18px; border-radius: 22px; cursor: pointer; font-weight: 600; letter-spacing: .5px; }
.btn:hover { filter: brightness(1.08); }
.btn:active { transform: translateY(1px); }
.summary-table { margin: 10px 0 18px; font-size: 13px; text-align: left; }
.summary-header, .summary-row, .summary-footer { display: grid; grid-template-columns: 1fr 50px 50px; gap: 8px; padding: 4px 6px; }
.summary-header { font-weight: 600; border-bottom: 1px solid #e5e7eb; color:#334155; }
.summary-row:nth-child(odd) { background: #f9fafb; }
.summary-row span { color:#1e293b; }
.summary-footer span { color:#0f172a; }
.summary-row.dead { opacity: .55; text-decoration: line-through; }
.summary-footer { font-weight: 600; border-top: 1px solid #e5e7eb; margin-top: 4px; }
.summary-row .player { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
