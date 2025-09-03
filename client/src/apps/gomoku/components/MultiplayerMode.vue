<template>
  <div class="gomoku-mp-wrapper">
    <!-- 使用 currentRoom 作为更可靠的空房间判断 -->
    <div v-if="showLobby" class="gomoku-room-lobby">
      <h3>五子棋多人模式</h3>
      <div class="form-row">
        <label>玩家昵称</label>
        <input v-model="mpForm.playerName" placeholder="玩家昵称" />
      </div>
      <div class="form-row">
        <label>房间码（可选）</label>
        <input v-model="mpForm.joinCode" placeholder="输入房间码加入" />
      </div>
      <div class="form-row buttons">
        <button @click="createRoom" :disabled="mpLoading">创建房间</button>
        <button @click="joinRoom" :disabled="mpLoading">加入房间</button>
        <button @click="refreshRoomList" :disabled="!mp.isConnected">刷新房间列表</button>
        <button @click="$emit('back')">返回</button>
      </div>
      <p class="error" v-if="mp.error">{{ mp.error }}</p>

      <!-- 房间列表 -->
      <div class="room-list-section">
        <h4>活跃房间</h4>
        <div v-if="safeRoomList.length === 0" class="no-rooms">
          暂无活跃房间，创建一个房间开始游戏吧！
        </div>
        <div v-else class="room-grid">
          <GomokuRoomCard
            v-for="room in safeRoomList"
            :key="room.room_code"
            :room="room"
            @join="joinRoomByCode"
            @spectate="spectateRoom"
          />
        </div>
      </div>
    </div>

    <div v-else class="gomoku-room">
      <div class="room-header">
        <div class="room-info">
          <span class="room-title">房间: {{ (mp.currentRoom?.room_code || mp.currentRoom?.roomCode) }}</span>
          <span v-if="latestRoomCode" class="room-created-info">
            <span class="status-badge created">已创建</span>
          </span>
        </div>
        <div class="room-actions">
          <button @click="copyRoomCode" :disabled="!(latestRoomCode || mp.currentRoom)" class="btn-copy">
            📋 复制房间码
          </button>
          <button @click="leaveRoom" class="btn-leave">🚪 离开</button>
          <button @click="$emit('back')" class="btn-back">⬅️ 返回</button>
        </div>
      </div>

      <div class="players-section">
        <h4>玩家席位</h4>
        <div class="players">
          <div v-for="p in seatSlots" :key="p.seat" :class="['player-card', { me: p.session_id === mp.currentPlayer?.session_id, ready: p.is_ready }]">
            <div class="player-avatar">
              {{ (p.player_name || ('玩家' + p.seat)).charAt(0).toUpperCase() }}
            </div>
            <div class="player-info">
              <strong class="player-name">{{ p.player_name || ('玩家' + p.seat) }}</strong>
              <span class="player-status">
                <span class="seat-info">座位 {{ p.seat || '?' }}</span>
                <span :class="['ready-status', p.is_ready ? 'ready' : 'not-ready']">
                  {{ p.is_ready ? '✅ 已准备' : '⏳ 未准备' }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 仅在需要调试时打开以下内容 -->
      <div v-if="false" style="font-size:12px;color:#bbb;margin-top:8px;">
        <div>playersDebug: {{ playersDebug }}</div>
        <div>wsDebug: {{ wsDebug }}</div>
      </div>

      <div class="game-controls" v-if="mp.isInRoom">
        <div class="controls-section">
          <h4>游戏控制</h4>
          <div class="actions">
            <button @click="toggleReady" :class="['btn-ready', mp.isReady ? 'ready' : 'not-ready']">
              {{ mp.isReady ? '❌ 取消准备' : '✅ 准备' }}
            </button>
            <button @click="startGame" :disabled="!mp.canStart" class="btn-start">
              🎮 开始对局
            </button>
          </div>
          <div class="game-status">
            <span class="status-info">
              状态: {{ unref(mp.gameStatus) === 'waiting' ? '等待开始' : unref(mp.gameStatus) === 'playing' ? '游戏进行中' : '大厅' }}
            </span>
            <span class="connection-info">
              连接: {{ mp.isConnected ? '✅ 已连接' : '❌ 断开' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="showGameBoard" class="mp-board-wrapper">
        <GomokuBoard
          ref="gomokuBoard"
          :board="mpBoard.board"
          :current-player="mpBoard.currentPlayer"
          :game-over="!!mpBoard.winner"
          :last-move="mpBoard.lastMove"
          :restrict-to-player-one="false"
          :my-player-number="unref(mp.mySeat) || 1"
          @move="onMpMove"
        />
        <div class="mp-status">
          <div>当前轮到: {{ mpBoard.currentPlayer === 1 ? '黑' : '白' }}</div>
          <div v-if="mpBoard.winner">胜者: {{ mpBoard.winner === 1 ? '黑' : '白' }}</div>
          <button v-if="unref(mp.gameStatus) === 'finished'" @click="startGame" :disabled="!mp.canStart">再来一局</button>
          <div style="margin-top: 8px; font-size: 12px; color: #999;">
            Game Debug: Status={{ unref(mp.gameStatus) }}, MySeat={{ unref(mp.mySeat) }}, Board={{ mpBoard.board?.[0]?.[0] !== undefined ? 'loaded' : 'empty' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import GomokuBoard from '../GomokuBoard.vue';
import GomokuRoomCard from './GomokuRoomCard.vue';
import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { reactive, ref, computed, unref, watch } from 'vue';

const props = defineProps({
  mpForm: Object,
  mpLoading: Boolean,
  latestRoomCode: String
});

const emit = defineEmits(['back', 'update:mpForm', 'update:mpLoading', 'update:latestRoomCode']);

const mp = useGomokuMultiplayer();
const mpBoard = reactive({
  board: Array.from({ length: 15 }, () => Array(15).fill(0)),
  currentPlayer: 1,
  lastMove: null,
  winner: null
});

// 固定两个座位槽位，优先填充来自 mp.players 的数据
const seatSlots = computed(() => {
  const slots = [
    { seat: 1, player_name: null, session_id: null, is_ready: false },
    { seat: 2, player_name: null, session_id: null, is_ready: false }
  ];
  try {
    const players = unref(mp.players) || [];
    console.debug('[MultiplayerMode] seatSlots update, players:', players);
    players.forEach(p => {
      if (p && p.seat && p.seat >= 1 && p.seat <= 2) {
        slots[p.seat - 1] = { ...slots[p.seat - 1], ...p };
        console.debug('[MultiplayerMode] Updated slot', p.seat - 1, 'with player:', p);
      }
    });
  } catch (e) {
    console.error('[MultiplayerMode] seatSlots error:', e);
  }
  return slots;
});

// Safe room list: ensure we only expose a plain array of room objects to the template
const safeRoomList = computed(() => {
  try {
    const list = unref(mp.roomList);
    return Array.isArray(list) ? list.filter(r => r && typeof r === 'object') : [];
  } catch (e) {
    return [];
  }
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

const showLobby = computed(() => {
  try {
    const inRoom = unref(mp.isInRoom);
    const room = unref(mp.currentRoom);
    const players = unref(mp.players) || [];
    return !inRoom && (!room || players.length === 0);
  } catch (e) {
    return true;
  }
});

const showGameBoard = computed(() => {
  try {
    const status = unref(mp.gameStatus);
    return status === 'playing' || status === 'finished';
  } catch (e) {
    return false;
  }
});

async function createRoom() {
  emit('update:mpLoading', true);
  try {
    const room = await mp.createRoom(props.mpForm.playerName);
    emit('update:latestRoomCode', room?.room_code || room?.roomCode || null);
    console.debug('[MultiplayerMode] Room created successfully:', props.latestRoomCode);
  } catch (e) {
    console.error('[MultiplayerMode] Failed to create room:', e);
  } finally {
    emit('update:mpLoading', false);
    localStorage.setItem('gomoku_mp_name', props.mpForm.playerName);
  }
}

async function joinRoom() {
  if (!props.mpForm.joinCode) return;
  emit('update:mpLoading', true);
  try {
    const room = await mp.joinRoom(props.mpForm.playerName, props.mpForm.joinCode);
    emit('update:latestRoomCode', room?.room_code || room?.roomCode || null);
    console.debug('[MultiplayerMode] Joined room successfully:', props.latestRoomCode);
  } catch (e) {
    console.error('[MultiplayerMode] Failed to join room:', e);
  } finally {
    emit('update:mpLoading', false);
    localStorage.setItem('gomoku_mp_name', props.mpForm.playerName);
  }
}

// 通过房间码直接加入
async function joinRoomByCode(roomCode) {
  if (!props.mpForm.playerName.trim()) {
    mp.error.value = '请输入玩家昵称';
    return;
  }
  emit('update:mpLoading', true);
  try {
    const room = await mp.joinRoom(props.mpForm.playerName, roomCode);
    emit('update:latestRoomCode', room?.room_code || room?.roomCode || null);
    console.debug('[MultiplayerMode] Joined room by card:', props.latestRoomCode);
  } catch (e) {
    console.error('[MultiplayerMode] Failed to join room by card:', e);
  } finally {
    emit('update:mpLoading', false);
    localStorage.setItem('gomoku_mp_name', props.mpForm.playerName);
  }
}

// 观战功能（暂时不实现）
function spectateRoom(roomCode) {
  console.log('观战功能暂未实现:', roomCode);
}

// 刷新房间列表
function refreshRoomList() {
  console.debug('[MultiplayerMode] Refreshing room list');
  mp.getRoomList();
}

// 监听WebSocket连接状态
watch(() => mp.isConnected, (connected) => {
  if (connected) {
    // 连接成功后获取房间列表
    setTimeout(() => {
      mp.getRoomList();
    }, 500); // 稍微延迟确保连接稳定
  }
});

// 监听房间创建成功后自动刷新房间列表
watch(() => mp.currentRoom, (room) => {
  if (room && !mp.isInRoom) {
    // 房间创建成功后刷新列表（给其他用户看到）
    setTimeout(() => {
      mp.getRoomList();
    }, 1000);
  }
});

function toggleReady() {
  console.debug('[MultiplayerMode] toggleReady called');
  mp.toggleReady();
}

function startGame() {
  console.debug('[MultiplayerMode] startGame called');
  mp.startGame();
}

function leaveRoom() {
  mp.leaveRoom();
}

function onMpMove(row, col) {
  const code = unref(mp.currentRoom)?.room_code || unref(mp.currentRoom)?.roomCode;
  console.debug('[MultiplayerMode] Move attempt:', row, col, 'roomCode:', code);
  if (!code) {
    console.warn('[MultiplayerMode] No room code available for move');
    return;
  }
  mp.place(row, col);
}

function copyRoomCode() {
  const code = props.latestRoomCode || mp.currentRoom?.room_code || mp.currentRoom?.roomCode;
  if (!code || !navigator?.clipboard) return;
  navigator.clipboard.writeText(code).then(() => {
    // 可以添加复制成功的提示
  }).catch(() => {});
}

// 监听游戏状态变化
watch(() => mp.gameStatus, (newStatus, oldStatus) => {
  console.debug('[MultiplayerMode] gameStatus changed from', oldStatus, 'to', newStatus);
}, { immediate: true });

// 监听游戏板显示状态变化
watch(showGameBoard, (newShow, oldShow) => {
  console.debug('[MultiplayerMode] showGameBoard changed from', oldShow, 'to', newShow);
  console.debug('[MultiplayerMode] Current gameStatus:', unref(mp.gameStatus));
}, { immediate: true });

// 监听服务器 gameState 更新
mp.events.onGameUpdate(data => {
  console.debug('[MultiplayerMode] GameUpdate event received:', data);
  if (!data) return;
  const gs = data.game_state || data;
  console.debug('[MultiplayerMode] Game state:', gs);
  if (gs?.board) {
    mpBoard.board = gs.board;
    console.debug('[MultiplayerMode] Updated board:', gs.board);
  }
  if (gs?.currentPlayer) {
    mpBoard.currentPlayer = gs.currentPlayer;
    console.debug('[MultiplayerMode] Updated currentPlayer:', gs.currentPlayer);
  }
  mpBoard.lastMove = gs.lastMove || null;
  mpBoard.winner = gs.winner || null;
  console.debug('[MultiplayerMode] Updated mpBoard:', mpBoard);
});
</script>

<style scoped>
.gomoku-mp-wrapper {
  position: relative;
  min-height: 540px;
}

.gomoku-room-lobby {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.15);
  padding: 24px;
  border-radius: 12px;
}

.gomoku-room-lobby input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.gomoku-room-lobby .buttons {
  display: flex;
  gap: 12px;
}

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
  background: rgba(0, 123, 255, 0.2);
  color: #007bff;
  border: 1px solid rgba(0, 123, 255, 0.3);
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

.player-card {
  background: rgba(255, 255, 255, 0.15);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  border: 2px solid transparent;
  transition: all 0.2s;
  min-width: 200px;
}

.player-card.me {
  border-color: #ffd24d;
  background: rgba(255, 210, 77, 0.2);
}

.player-card.ready {
  border-color: #28a745;
  background: rgba(40, 167, 69, 0.15);
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name {
  color: #fff;
  font-weight: 600;
}

.player-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seat-info {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.ready-status {
  font-size: 12px;
  font-weight: 500;
}

.ready-status.ready {
  color: #28a745;
}

.ready-status.not-ready {
  color: #ffc107;
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
  background: rgba(0, 123, 255, 0.2);
  color: #007bff;
  border: 2px solid rgba(0, 123, 255, 0.3);
}

.btn-start:disabled {
  background: rgba(108, 117, 125, 0.2);
  color: rgba(255, 255, 255, 0.5);
  border-color: rgba(108, 117, 125, 0.3);
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

.error {
  color: #ff8080;
}

/* 房间列表样式 */
.room-list-section {
  margin-top: 24px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.room-list-section h4 {
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-list-section h4::before {
  content: "🏠";
  font-size: 20px;
}

.no-rooms {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  padding: 40px 20px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .room-grid {
    grid-template-columns: 1fr;
  }
}
</style>
