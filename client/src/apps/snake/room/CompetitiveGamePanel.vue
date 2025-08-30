<template>
  <div class="competitive-game-panel">
    <h4>⚔️ 竞技模式游戏</h4>
    
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
        :specialFood="null"
        :particles="[]"
        :gameOver="false"
      />
    </div>

    <!-- 控制提示 -->
    <div class="control-hints">
      <h5>🎮 控制方式</h5>
      <div class="controls">
        <span class="control-key">WASD</span>
        <span class="control-or">或</span>
        <span class="control-key">方向键</span>
        <span class="control-desc">控制蛇的移动</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import SnakeCanvas from '../SnakeCanvas.vue'
const props = defineProps({
  gameState: { type: Object, required: true }
});
const boardPx = 400;
const gridSize = 20;
const cell = boardPx / gridSize;
const canvasRef = ref(null);
const primaryFood = computed(() => {
  const foods = props.gameState?.foods;
  if (Array.isArray(foods) && foods.length > 0) return foods[0];
  return props.gameState?.food || { x: 0, y: 0 };
});

watch(() => props.gameState, () => {
  nextTick(() => { canvasRef.value?.draw?.(); });
}, { deep: true, immediate: true });

const emit = defineEmits(['move'])

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

.control-hints {
  background: #f0f8ff;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e1e8ed;
}

.control-hints h5 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.control-key {
  padding: 6px 12px;
  background: white;
  border: 1px solid #ccc;
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
</style>
