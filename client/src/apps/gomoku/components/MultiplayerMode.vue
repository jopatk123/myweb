<template>
  <div class="gomoku-mp-wrapper">
    <GomokuLobby
      v-if="showLobby"
      :mp="props.mp"
      :mp-form="mpForm"
      :mp-loading="mpLoading"
      @back="$emit('back')"
      @update:mp-form="$emit('update:mpForm', $event)"
      @update:mp-loading="$emit('update:mpLoading', $event)"
      @update:latest-room-code="handleLatestRoomCodeUpdate"
    />

    <GomokuRoom
      v-else
      :mp="props.mp"
      :latest-room-code="latestRoomCode"
      @back="$emit('back')"
    />

    <GomokuGameWrapper
      v-if="showGameBoard"
      :mp="props.mp"
      :can-start="props.mp.canStart"
      @start-game="startGame"
      @move="onMpMove"
    />
  </div>
</template>

<script setup>
import GomokuLobby from './GomokuLobby.vue';
import GomokuRoom from './GomokuRoom.vue';
import GomokuGameWrapper from './GomokuGameWrapper.vue';
// import { useGomokuMultiplayer } from '@/composables/useGomokuMultiplayer.js';
import { computed, unref, watch } from 'vue';

const props = defineProps({
  mp: Object,
  mpForm: Object,
  mpLoading: Boolean,
  latestRoomCode: String
});

const emit = defineEmits(['back', 'update:mpForm', 'update:mpLoading', 'update:latestRoomCode']);

// 使用传入的 mp 实例，而不是创建新的
// const mp = useGomokuMultiplayer();

const showLobby = computed(() => {
  try {
    const inRoom = unref(props.mp.isInRoom);
    const room = unref(props.mp.currentRoom);
    const players = unref(props.mp.players) || [];
    return !inRoom && (!room || players.length === 0);
  } catch {
    return true;
  }
});

const showGameBoard = computed(() => {
  try {
    const status = unref(props.mp.gameStatus);
    return status === 'playing' || status === 'finished';
  } catch {
    return false;
  }
});

// 监听WebSocket连接状态
watch(() => props.mp.isConnected, (connected) => {
  if (connected) {
    // 连接成功后获取房间列表
    setTimeout(() => {
      props.mp.getRoomList();
    }, 500); // 稍微延迟确保连接稳定
  }
});

// 确保当切换回大厅时，父组件的 mpLoading 不会卡住（例如 create/join 超时或未清理时）
watch(showLobby, (isLobby) => {
  if (isLobby) {
    // 向父组件发出更新，确保创建/加入按钮可以重新启用
    try {
      emit('update:mpLoading', false);
      console.debug('[MultiplayerMode] Emitted update:mpLoading false when showing lobby');
    } catch (e) {
      console.warn('[MultiplayerMode] Failed to emit mpLoading reset:', e);
    }
  }
});

// 监听房间创建成功后自动刷新房间列表
watch(() => props.mp.currentRoom, (room) => {
  if (room && !props.mp.isInRoom) {
    // 房间创建成功后刷新列表（给其他用户看到）
    setTimeout(() => {
      props.mp.getRoomList();
    }, 1000);
  }
});

// 监听游戏状态变化
watch(() => props.mp.gameStatus, (newStatus, oldStatus) => {
  console.debug('[MultiplayerMode] gameStatus changed from', oldStatus, 'to', newStatus);
}, { immediate: true });

// 监听游戏板显示状态变化
watch(showGameBoard, (newShow, oldShow) => {
  console.debug('[MultiplayerMode] showGameBoard changed from', oldShow, 'to', newShow);
  console.debug('[MultiplayerMode] Current gameStatus:', unref(props.mp.gameStatus));
}, { immediate: true });

function startGame() {
  console.debug('[MultiplayerMode] startGame called');
  props.mp.startGame();
}

function onMpMove(row, col) {
  const code = unref(props.mp.currentRoom)?.room_code || unref(props.mp.currentRoom)?.roomCode;
  console.debug('[MultiplayerMode] Move attempt:', row, col, 'roomCode:', code);
  if (!code) {
    console.warn('[MultiplayerMode] No room code available for move');
    return;
  }
  props.mp.place(row, col);
}

function handleLatestRoomCodeUpdate(newCode) {
  console.debug('[MultiplayerMode] handleLatestRoomCodeUpdate called with:', newCode);
  emit('update:latestRoomCode', newCode);
  console.debug('[MultiplayerMode] Emitted update:latestRoomCode with:', newCode);
}
</script>

<style scoped>
.gomoku-mp-wrapper {
  position: relative;
  min-height: 540px;
}
</style>
