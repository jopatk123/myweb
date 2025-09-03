<template>
  <div class="mp-board-wrapper">
    <GomokuBoard
      ref="gomokuBoard"
      :board="board"
      :current-player="currentPlayer"
      :game-over="!!winner"
      :last-move="lastMove"
      :restrict-to-player-one="false"
      :my-player-number="mySeat"
      @move="onMove"
    />
    <div class="mp-status">
      <div>当前轮到: {{ currentPlayer === 1 ? '黑' : '白' }}</div>
      <div v-if="winner">胜者: {{ winner === 1 ? '黑' : '白' }}</div>
      <button v-if="gameStatus === 'finished'" @click="startGame" :disabled="!canStart">再来一局</button>
      <div style="margin-top: 8px; font-size: 12px; color: #999;">
        Game Debug: Status={{ gameStatus }}, MySeat={{ mySeat }}, Board={{ board?.[0]?.[0] !== undefined ? 'loaded' : 'empty' }}
      </div>
    </div>

    <!-- 游戏结束弹窗 -->
    <div v-if="showGameEndDialog" class="game-end-dialog-backdrop" @click.self="closeDialog">
      <div class="game-end-dialog">
        <div class="dialog-title">游戏结束</div>
        <div class="dialog-content">
          <p>{{ winner === mySeat ? '恭喜你赢得了比赛！' : '很遗憾，你输掉了比赛。' }}</p>
        </div>
        <div class="dialog-actions">
          <button @click="closeDialog">确定</button>
          <button @click="restartGame">再来一局</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import GomokuBoard from '../GomokuBoard.vue';
import { reactive, unref, watch, computed, ref } from 'vue';

const props = defineProps({ mp: Object, canStart: Boolean });
const emit = defineEmits(['start-game', 'move']);

const mp = props.mp;

const mpBoard = reactive({
  board: Array.from({ length: 15 }, () => Array(15).fill(0)),
  currentPlayer: 1,
  lastMove: null,
  winner: null,
});

const showGameEndDialog = ref(false);

const board = computed(() => mpBoard.board);
const currentPlayer = computed(() => mpBoard.currentPlayer);
const lastMove = computed(() => mpBoard.lastMove);
const winner = computed(() => mpBoard.winner);
const mySeat = computed(() => unref(mp.mySeat));
const gameStatus = computed(() => unref(mp.gameStatus));
const canStart = computed(() => props.canStart);

function applyGameState(gs) {
  if (!gs) return;
  if (gs.board) mpBoard.board = gs.board;
  if (gs.currentPlayer) mpBoard.currentPlayer = gs.currentPlayer;
  mpBoard.lastMove = gs.lastMove || null;
  const prev = mpBoard.winner;
  mpBoard.winner = gs.winner || null;
  if (!prev && mpBoard.winner) {
    showGameEndDialog.value = true;
  }
}

function handleGameUpdate(data) {
  const gs = data?.game_state || data;
  applyGameState(gs);
}

function handleMatchEnd(data) {
  const gs = data?.game_state || data;
  applyGameState(gs);
  showGameEndDialog.value = true;
}

let _registered = false;
watch(() => mp && mp.events, (ev) => {
  if (!ev || _registered) return;
  if (typeof ev.onGameUpdate === 'function') ev.onGameUpdate(handleGameUpdate);
  if (typeof ev.onMatchEnd === 'function') ev.onMatchEnd(handleMatchEnd);
  _registered = true;
}, { immediate: true });

watch(() => unref(mp.gameState), (gs) => { if (gs) applyGameState(gs); }, { immediate: true });
watch(() => unref(mp.gameStatus), (s) => { if (s === 'finished') showGameEndDialog.value = true; }, { immediate: true });

function onMove(row, col) { emit('move', row, col); }
function startGame() { emit('start-game'); }
function closeDialog() { showGameEndDialog.value = false; }
function restartGame() { startGame(); showGameEndDialog.value = false; }
</script>
<style scoped>
.mp-board-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mp-status {
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 游戏结束弹窗样式 */
.game-end-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.game-end-dialog {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  text-align: center;
  color: #333;
}

.dialog-content {
  margin-bottom: 20px;
  text-align: center;
  color: #555;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.dialog-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.dialog-actions button:first-child {
  background: #6c757d;
  color: white;
}

.dialog-actions button:first-child:hover {
  background: #5a6268;
}

.dialog-actions button:last-child {
  background: #007bff;
  color: white;
}

.dialog-actions button:last-child:hover {
  background: #0056b3;
}
</style>
