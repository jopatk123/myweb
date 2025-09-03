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
</template>

<script setup>
import GomokuRoomCard from './GomokuRoomCard.vue';
import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { computed, unref } from 'vue';

const props = defineProps({
  mpForm: Object,
  mpLoading: Boolean
});

const emit = defineEmits(['back', 'update:mpForm', 'update:mpLoading', 'update:latestRoomCode']);

const mp = useGomokuMultiplayer();

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
  emit('update:mpLoading', true);
  try {
    const room = await mp.createRoom(props.mpForm.playerName);
    emit('update:latestRoomCode', room?.room_code || room?.roomCode || null);
    console.debug('[GomokuLobby] Room created successfully:', room?.room_code || room?.roomCode);
  } catch (e) {
    console.error('[GomokuLobby] Failed to create room:', e);
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
    console.debug('[GomokuLobby] Joined room successfully:', room?.room_code || room?.roomCode);
  } catch (e) {
    console.error('[GomokuLobby] Failed to join room:', e);
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
