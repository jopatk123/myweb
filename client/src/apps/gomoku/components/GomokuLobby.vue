<template>
  <div class="gomoku-room-lobby">
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
      <button class="btn primary" @click="createRoom" :disabled="mpLoading || !mpForm.playerName.trim()">创建房间</button>
      <button class="btn secondary" @click="joinRoom" :disabled="mpLoading || !mpForm.playerName.trim() || !mpForm.joinCode">加入房间</button>
      <button class="btn ghost" @click="refreshRoomList" :disabled="!mp.isConnected">刷新房间列表</button>
      <button class="btn" @click="$emit('back')">返回</button>
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
</template>

<script setup>
import GomokuRoomCard from './GomokuRoomCard.vue';
// import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { computed, unref, onMounted, watch } from 'vue';

const props = defineProps({
  mp: Object,
  mpForm: Object,
  mpLoading: Boolean
});

const emit = defineEmits(['back', 'update:mpForm', 'update:mpLoading', 'update:latestRoomCode']);

// 使用传入的 mp 实例，而不是创建新的

// Ensure local references to props are available as variables used below
// (props.mp is an object containing refs/methods like createRoom/getRoomList)
const mp = props.mp;
const mpForm = props.mpForm;
const mpLoading = props.mpLoading;

// Safe room list: ensure we only expose a plain array of room objects to the template
const safeRoomList = computed(() => {
  try {
    const list = unref(mp.roomList);
    return Array.isArray(list) ? list.filter(r => r && typeof r === 'object') : [];
  } catch (e) {
    return [];
  }
});

async function createRoom() {
  if (!props.mpForm.playerName.trim()) {
    mp.error.value = '请输入玩家昵称';
    return;
  }
  
  emit('update:mpLoading', true);
  try {
    console.debug('[GomokuLobby] Creating room for:', props.mpForm.playerName);
    const room = await mp.createRoom(props.mpForm.playerName);
    console.debug('[GomokuLobby] Room created result:', room);
    const roomCode = room?.room_code || room?.roomCode || null;
    console.debug('[GomokuLobby] Extracted roomCode:', roomCode);
    emit('update:latestRoomCode', roomCode);
    console.debug('[GomokuLobby] Emitted latestRoomCode:', roomCode);
  } catch (e) {
    console.error('[GomokuLobby] Failed to create room:', e);
    mp.error.value = e.message || '创建房间失败，请重试';
  } finally {
    emit('update:mpLoading', false);
    localStorage.setItem('gomoku_mp_name', props.mpForm.playerName);
  }
}

async function joinRoom() {
  if (!props.mpForm.playerName.trim()) {
    mp.error.value = '请输入玩家昵称';
    return;
  }
  if (!props.mpForm.joinCode) {
    mp.error.value = '请输入房间码';
    return;
  }
  
  emit('update:mpLoading', true);
  try {
    console.debug('[GomokuLobby] Joining room:', props.mpForm.joinCode, 'for:', props.mpForm.playerName);
    const room = await mp.joinRoom(props.mpForm.playerName, props.mpForm.joinCode);
    emit('update:latestRoomCode', room?.room_code || room?.roomCode || null);
    console.debug('[GomokuLobby] Joined room successfully:', room?.room_code || room?.roomCode);
  } catch (e) {
    console.error('[GomokuLobby] Failed to join room:', e);
    mp.error.value = e.message || '加入房间失败，请检查房间码是否正确';
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
    console.debug('[GomokuLobby] Joined room by card:', room?.room_code || room?.roomCode);
  } catch (e) {
    console.error('[GomokuLobby] Failed to join room by card:', e);
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
  console.debug('[GomokuLobby] Refreshing room list');
  mp.getRoomList();
}

// 进入多人模式后默认自动刷新一次房间列表：
// - 如果已经连接则立即刷新
// - 如果尚未连接，则监听 isConnected，连接成功后只触发一次刷新
onMounted(() => {
  try {
    if (!mp) return;
    const isConnected = unref(mp.isConnected);
    if (isConnected) {
      refreshRoomList();
      return;
    }

    // 监听连接状态，连接后触发一次刷新并停止监听
    const stopWatcher = watch(
      () => unref(mp.isConnected),
      (val) => {
        if (val) {
          refreshRoomList();
          stopWatcher();
        }
      }
    );
  } catch (e) {
    console.warn('[GomokuLobby] 自动刷新房间列表失败:', e);
  }
});
</script>

<style scoped>
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
  flex-wrap: wrap;
  align-items: center;
}

/* 按钮通用样式 */
.gomoku-room-lobby .btn {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #0b0b0b;
  background: rgba(255, 255, 255, 0.9);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
  box-shadow: 0 2px 6px rgba(2,6,23,0.15);
}

.gomoku-room-lobby .btn.primary {
  background: linear-gradient(180deg, #ffd166, #fca311);
  color: #0b0b0b;
}

.gomoku-room-lobby .btn.secondary {
  background: linear-gradient(180deg, #89f7fe, #66d9e8);
  color: #022b3a;
}

.gomoku-room-lobby .btn.ghost {
  background: transparent;
  color: #ffffff;
  border: 1px solid rgba(255,255,255,0.12);
}

.gomoku-room-lobby .btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(2,6,23,0.18);
}

.gomoku-room-lobby .btn:active:not(:disabled) {
  transform: translateY(0);
}

.gomoku-room-lobby .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 在窄屏上将按钮竖直排列并让每个按钮占满宽度 */
@media (max-width: 560px) {
  .gomoku-room-lobby .buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .gomoku-room-lobby .btn {
    width: 100%;
  }
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
