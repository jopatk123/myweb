<template>
  <div class="multiplayer-lobby">
    <LobbyHeader
      :title="title"
      :loading="loading"
      @showStats="$emit('showStats')"
      @showLeaderboard="$emit('showLeaderboard')"
      @refreshRooms="refreshRooms"
    >
      <template #header-actions>
        <slot name="header-actions"></slot>
      </template>
    </LobbyHeader>

    <ErrorMessage :error="error" @clearError="clearError" />

    <ConnectionStatus v-if="!isConnected" />

    <div v-else class="lobby-content">
      <QuickStart
        v-model:playerName="playerName"
        v-model:selectedMode="selectedMode"
        :playerNamePlaceholder="playerNamePlaceholder"
        :gameModes="gameModes"
        :loading="loading"
        @quickJoin="quickJoin"
        @showCreateRoom="showCreateRoom = true"
      >
        <template #mode-selector="{ selectedMode, onModeChange }">
          <slot name="mode-selector" :selectedMode="selectedMode" :onModeChange="onModeChange"></slot>
        </template>
      </QuickStart>

      <RoomList
        :activeRooms="activeRooms"
        :gameModes="gameModes"
        :loading="loading"
        @joinRoom="joinRoom"
      >
        <template #room-mode="{ room }">
          <slot name="room-mode" :room="room"></slot>
        </template>
      </RoomList>
    </div>

    <CreateRoomModal
      v-if="showCreateRoom"
      :gameModes="gameModes"
      :loading="loading"
      :initialConfig="roomConfig"
      @close="showCreateRoom = false"
      @createRoom="createRoom"
    >
      <template #create-room-form="{ roomConfig, onConfigChange }">
        <slot name="create-room-form" :roomConfig="roomConfig" :onConfigChange="onConfigChange"></slot>
      </template>
    </CreateRoomModal>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import LobbyHeader from './LobbyHeader.vue';
import ErrorMessage from './ErrorMessage.vue';
import ConnectionStatus from './ConnectionStatus.vue';
import QuickStart from './QuickStart.vue';
import RoomList from './RoomList.vue';
import CreateRoomModal from './CreateRoomModal.vue';

const props = defineProps({
  title: {
    type: String,
    default: '多人游戏大厅'
  },
  playerNamePlaceholder: {
    type: String,
    default: '输入您的昵称'
  },
  gameModes: {
    type: Array,
    default: () => [
      { value: 'shared', label: '共享模式', icon: '🤝', description: '多人协作' },
      { value: 'competitive', label: '竞技模式', icon: '⚔️', description: '玩家对战' }
    ]
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

const emit = defineEmits([
  'quickJoin',
  'createRoom', 
  'joinRoom',
  'refreshRooms',
  'showStats',
  'showLeaderboard',
  'clearError'
]);

// 本地状态
const playerName = ref('');
const selectedMode = ref(props.gameModes[0]?.value || 'shared');
const showCreateRoom = ref(false);
const activeRooms = ref([]);

// 房间配置
const roomConfig = ref({
  mode: selectedMode.value,
  maxPlayers: 4
});

// 当选择的模式改变时，更新房间创建配置的默认模式
watch(selectedMode, (newMode) => {
  roomConfig.value.mode = newMode;
});

// 方法
const quickJoin = () => {
  if (playerName.value.trim()) {
    emit('quickJoin', {
      playerName: playerName.value.trim(),
      mode: selectedMode.value
    });
  }
};

const createRoom = (config) => {
  if (playerName.value.trim()) {
    emit('createRoom', {
      playerName: playerName.value.trim(),
      ...config
    });
    showCreateRoom.value = false;
  }
};

const joinRoom = (roomCode) => {
  if (playerName.value.trim()) {
    emit('joinRoom', {
      playerName: playerName.value.trim(),
      roomCode
    });
  }
};

const refreshRooms = () => {
  emit('refreshRooms');
};

const clearError = () => {
  emit('clearError');
};

// 生命周期
onMounted(() => {
  refreshRooms();
});

// 暴露给父组件
defineExpose({
  setActiveRooms: (rooms) => {
    activeRooms.value = rooms;
  },
  getPlayerName: () => playerName.value,
  getSelectedMode: () => selectedMode.value
});
</script>

<style scoped>
.multiplayer-lobby {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.lobby-content {
  margin-top: 20px;
}
</style>
