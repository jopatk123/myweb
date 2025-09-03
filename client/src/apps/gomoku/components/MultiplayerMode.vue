<template>
  <div class="gomoku-mp-wrapper">
    <GomokuLobby
      v-if="showLobby"
      :mp-form="mpForm"
      :mp-loading="mpLoading"
      @back="$emit('back')"
      @update:mp-form="$emit('update:mpForm', $event)"
      @update:mp-loading="$emit('update:mpLoading', $event)"
      @update:latest-room-code="$emit('update:latestRoomCode', $event)"
    />

    <GomokuRoom
      v-else
      :latest-room-code="latestRoomCode"
      @back="$emit('back')"
    />

    <GomokuGameWrapper
      v-if="showGameBoard"
      :can-start="mp.canStart"
      @start-game="startGame"
      @move="onMpMove"
    />
  </div>
</template>

<script setup>
import GomokuLobby from './GomokuLobby.vue';
import GomokuRoom from './GomokuRoom.vue';
import GomokuGameWrapper from './GomokuGameWrapper.vue';
import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { computed, unref, watch } from 'vue';

const props = defineProps({
  mpForm: Object,
  mpLoading: Boolean,
  latestRoomCode: String
});

const emit = defineEmits(['back', 'update:mpForm', 'update:mpLoading', 'update:latestRoomCode']);

const mp = useGomokuMultiplayer();

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

// 监听游戏状态变化
watch(() => mp.gameStatus, (newStatus, oldStatus) => {
  console.debug('[MultiplayerMode] gameStatus changed from', oldStatus, 'to', newStatus);
}, { immediate: true });

// 监听游戏板显示状态变化
watch(showGameBoard, (newShow, oldShow) => {
  console.debug('[MultiplayerMode] showGameBoard changed from', oldShow, 'to', newShow);
  console.debug('[MultiplayerMode] Current gameStatus:', unref(mp.gameStatus));
}, { immediate: true });

function startGame() {
  console.debug('[MultiplayerMode] startGame called');
  mp.startGame();
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
</script>

<style scoped>
.gomoku-mp-wrapper {
  position: relative;
  min-height: 540px;
}
</style>
