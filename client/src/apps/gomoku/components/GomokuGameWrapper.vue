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
  </div>
</template>

<script setup>
import GomokuBoard from '../GomokuBoard.vue';
// import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { reactive, unref, watch, computed } from 'vue';

const props = defineProps({
  mp: Object,
  canStart: Boolean
});

const emit = defineEmits(['start-game', 'move']);

// 使用传入的 mp 实例，而不是创建新的
// const mp = useGomokuMultiplayer();

// local reference to props.mp
const mp = props.mp;

const mpBoard = reactive({
  board: Array.from({ length: 15 }, () => Array(15).fill(0)),
  currentPlayer: 1,
  lastMove: null,
  winner: null
});

const board = computed(() => mpBoard.board);
const currentPlayer = computed(() => mpBoard.currentPlayer);
const lastMove = computed(() => mpBoard.lastMove);
const winner = computed(() => mpBoard.winner);
const mySeat = computed(() => unref(mp.mySeat));
const gameStatus = computed(() => unref(mp.gameStatus));
const canStart = computed(() => props.canStart);

// 监听服务器 gameState 更新（guard: 确保 mp 和事件处理函数存在）
if (mp && mp.events && typeof mp.events.onGameUpdate === 'function') {
  mp.events.onGameUpdate(data => {
    console.debug('[GomokuGameWrapper] GameUpdate event received:', data);
    if (!data) return;
    const gs = data.game_state || data;
    console.debug('[GomokuGameWrapper] Game state:', gs);
    if (gs?.board) {
      mpBoard.board = gs.board;
      console.debug('[GomokuGameWrapper] Updated board:', gs.board);
    }
    if (gs?.currentPlayer) {
      mpBoard.currentPlayer = gs.currentPlayer;
      console.debug('[GomokuGameWrapper] Updated currentPlayer:', gs.currentPlayer);
    }
    mpBoard.lastMove = gs.lastMove || null;
    mpBoard.winner = gs.winner || null;
    console.debug('[GomokuGameWrapper] Updated mpBoard:', mpBoard);
  });
} else {
  console.debug('[GomokuGameWrapper] mp.events.onGameUpdate not available yet');
}

function onMove(row, col) {
  emit('move', row, col);
}

function startGame() {
  emit('start-game');
}
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
</style>
