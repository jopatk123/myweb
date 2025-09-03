<template>
  <div class="gomoku-room">
    <div class="room-header">
      <div class="room-info">
        <span class="room-title">房间: {{ roomCode }}</span>
        <span v-if="latestRoomCode" class="room-created-info">
          <span class="status-badge created">已创建</span>
        </span>
      </div>
      <div class="room-actions">
        <button @click="copyRoomCode" :disabled="!roomCode" class="btn-copy">
          📋 复制房间码
        </button>
        <button @click="leaveRoom" class="btn-leave">🚪 离开</button>
        <button @click="$emit('back')" class="btn-back">⬅️ 返回</button>
      </div>
    </div>

    <div class="players-section">
      <h4>玩家席位</h4>
      <div class="players">
        <GomokuPlayerCard
          v-for="p in seatSlots"
          :key="p.seat"
          :player="p"
          :is-me="p.session_id === currentPlayerSessionId"
        />
      </div>
    </div>

    <!-- 仅在需要调试时打开以下内容 -->
    <div v-if="false" style="font-size:12px;color:#bbb;margin-top:8px;">
      <div>playersDebug: {{ playersDebug }}</div>
      <div>wsDebug: {{ wsDebug }}</div>
    </div>

    <div class="game-controls" v-if="isInRoom">
      <div class="controls-section">
        <h4>游戏控制</h4>
        <div class="actions">
          <button @click="toggleReady" :class="['btn-ready', isReady ? 'ready' : 'not-ready']">
            {{ isReady ? '❌ 取消准备' : '✅ 准备' }}
          </button>
          <button @click="startGame" :disabled="!canStart" class="btn-start">
            🎮 开始对局
          </button>
        </div>
        <div class="game-status">
          <span class="status-info">
            状态: {{ gameStatus === 'waiting' ? '等待开始' : gameStatus === 'playing' ? '游戏进行中' : '大厅' }}
          </span>
          <span class="connection-info">
            连接: {{ isConnected ? '✅ 已连接' : '❌ 断开' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import GomokuPlayerCard from './GomokuPlayerCard.vue';
import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { computed, unref } from 'vue';

const props = defineProps({
  latestRoomCode: String
});

const emit = defineEmits(['back']);

const mp = useGomokuMultiplayer();

const roomCode = computed(() => {
  return props.latestRoomCode || mp.currentRoom?.room_code || mp.currentRoom?.roomCode;
});

const currentPlayerSessionId = computed(() => {
  return mp.currentPlayer?.session_id;
});

const isInRoom = computed(() => unref(mp.isInRoom));
const isReady = computed(() => unref(mp.isReady));
const canStart = computed(() => unref(mp.canStart));
const gameStatus = computed(() => unref(mp.gameStatus));
const isConnected = computed(() => unref(mp.isConnected));

// 固定两个座位槽位，优先填充来自 mp.players 的数据
const seatSlots = computed(() => {
  const slots = [
    { seat: 1, player_name: null, session_id: null, is_ready: false },
    { seat: 2, player_name: null, session_id: null, is_ready: false }
  ];
  try {
    const players = unref(mp.players) || [];
    console.debug('[GomokuRoom] seatSlots update, players:', players);
    players.forEach(p => {
      if (p && p.seat && p.seat >= 1 && p.seat <= 2) {
        slots[p.seat - 1] = { ...slots[p.seat - 1], ...p };
        console.debug('[GomokuRoom] Updated slot', p.seat - 1, 'with player:', p);
      }
    });
  } catch (e) {
    console.error('[GomokuRoom] seatSlots error:', e);
  }
  return slots;
});

const playersDebug = computed(() => {
  try {
    return JSON.stringify(unref(mp.players) || []);
  } catch (e) {
    return String(unref(mp.players));
  }
});

const wsDebug = computed(() => {
  try {
    return `connected=${String(unref(mp.isConnected))} isInRoom=${String(unref(mp.isInRoom))} currentPlayer=${JSON.stringify(unref(mp.currentPlayer) || null)}`;
  } catch (e) {
    return '';
  }
});

function toggleReady() {
  console.debug('[GomokuRoom] toggleReady called');
  mp.toggleReady();
}

function startGame() {
  console.debug('[GomokuRoom] startGame called');
  mp.startGame();
}

function leaveRoom() {
  mp.leaveRoom();
}

function copyRoomCode() {
  const code = roomCode.value;
  if (!code || !navigator?.clipboard) return;
  navigator.clipboard.writeText(code).then(() => {
    // 可以添加复制成功的提示
  }).catch(() => {});
}
</script>

<style scoped>
.gomoku-room {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.12);
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  font-family: 'Monaco', 'Menlo', monospace;
}

.room-created-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.created {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.room-actions {
  display: flex;
  gap: 8px;
}

.room-actions button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy {
  background: rgba(255, 193, 7, 0.4);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.5);
}

.btn-leave {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.btn-back {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.3);
}

.players-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.players-section h4 {
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.players {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.game-controls {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.controls-section h4 {
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ready {
  border: 2px solid transparent;
}

.btn-ready.not-ready {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
  border-color: rgba(40, 167, 69, 0.3);
}

.btn-ready.ready {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border-color: rgba(255, 193, 7, 0.3);
}

.btn-start {
  background: rgba(40, 167, 69, 0.4);
  color: #28a745;
  border: 2px solid rgba(40, 167, 69, 0.5);
}

.btn-start:disabled {
  background: rgba(108, 117, 125, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border-color: rgba(108, 117, 125, 0.5);
  cursor: not-allowed;
}

.game-status {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.status-info,
.connection-info {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
