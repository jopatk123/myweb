<template>
  <div class="multiplayer-lobby" :class="themeClass">
    <LobbyHeader
      :title="computedTitle"
      :loading="loading"
      :show-settings="preset.showSettings"
      @show-settings="$emit('showSettings')"
      @refresh-rooms="refreshRooms"
    >
      <template #header-actions>
        <slot name="header-actions"></slot>
      </template>

      <template #logo>
        <slot name="logo">
          <span class="game-icon">{{ gameConfig.icon }}</span>
        </slot>
      </template>
    </LobbyHeader>

    <ErrorMessage :error="error" :auto-clear="5000" @clear-error="clearError" />

    <ConnectionStatus
      v-if="!isConnected && !loading"
      :connecting="connecting"
      :game-type="gameType"
      @retry="$emit('retry')"
    />

    <div v-else class="lobby-content">
      <LobbyQuickStartPanel
        v-if="preset.showCreateRoom"
        v-model:player-name="localPlayerName"
        v-model:selected-mode="localSelectedMode"
        :preset="preset"
        :player-name-placeholder="playerNamePlaceholder"
        :available-game-modes="availableGameModes"
        :loading="loading"
        :game-config="gameConfig"
        @open-create-room="showCreateRoom = true"
      >
        <template #mode-selector="slotProps">
          <slot
            name="mode-selector"
            v-bind="slotProps"
            :available-modes="availableGameModes"
          />
        </template>

        <template #quick-start-controls>
          <slot name="quick-start-controls" />
        </template>
      </LobbyQuickStartPanel>

      <LobbyRoomListPanel
        :active-rooms="activeRooms"
        :available-game-modes="availableGameModes"
        :game-config="gameConfig"
        :loading="loading"
        :empty-message="emptyRoomsMessage"
        @join-room="handleJoinRoom"
        @refresh="refreshRooms"
      >
        <template #room-mode="slotProps">
          <slot name="room-mode" v-bind="slotProps" />
        </template>

        <template #room-extra="slotProps">
          <slot name="room-extra" v-bind="slotProps" />
        </template>

        <template #room-actions="slotProps">
          <slot name="room-actions" v-bind="slotProps" />
        </template>
      </LobbyRoomListPanel>
    </div>

    <CreateRoomModalWrapper
      :show="showCreateRoom"
      :available-game-modes="availableGameModes"
      :game-config="gameConfig"
      :loading="loading"
      :initial-config="roomConfig"
      :player-name="localPlayerName"
      @close="showCreateRoom = false"
      @create-room="onCreateRoom"
    >
      <template #create-room-form="slotProps">
        <slot
          name="create-room-form"
          v-bind="slotProps"
          :game-config="gameConfig"
        />
      </template>

      <template #advanced-settings="slotProps">
        <slot name="advanced-settings" v-bind="slotProps" />
      </template>
    </CreateRoomModalWrapper>

    <slot name="modals" />
  </div>
</template>

<script setup>
  import { ref } from 'vue';
  import LobbyHeader from './LobbyHeader.vue';
  import ErrorMessage from './ErrorMessage.vue';
  import ConnectionStatus from './ConnectionStatus.vue';
  import LobbyQuickStartPanel from './LobbyQuickStartPanel.vue';
  import LobbyRoomListPanel from './LobbyRoomListPanel.vue';
  import CreateRoomModalWrapper from './CreateRoomModalWrapper.vue';
  import { COMPONENT_PRESETS } from '@/components/multiplayer/index.js';
  import { useLobbyConfig } from '@/composables/multiplayer/lobby/useLobbyConfig.js';
  import { useLobbyPlayerState } from '@/composables/multiplayer/lobby/useLobbyPlayerState.js';
  import { useLobbyAutoRefresh } from '@/composables/multiplayer/lobby/useLobbyAutoRefresh.js';
  import { useLobbyEvents } from '@/composables/multiplayer/lobby/useLobbyEvents.js';

  const props = defineProps({
    // 基础配置
    title: {
      type: String,
      default: null, // 如果为空，将根据游戏类型自动生成
    },
    gameType: {
      type: String,
      default: 'default',
    },

    // 玩家设置
    playerName: {
      type: String,
      default: '',
    },
    playerNamePlaceholder: {
      type: String,
      default: '输入您的昵称',
    },

    // 游戏模式
    gameModes: {
      type: Array,
      default: null, // 如果为空，将根据游戏类型自动获取
    },
    selectedMode: {
      type: String,
      default: null,
    },

    // 状态
    isConnected: {
      type: Boolean,
      default: false,
    },
    connecting: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },

    // 房间列表
    activeRooms: {
      type: Array,
      default: () => [],
    },

    // 主题和样式
    theme: {
      type: String,
      default: 'light',
      validator: value => ['light', 'dark', 'auto'].includes(value),
    },

    // 组件预设
    preset: {
      type: [String, Object],
      default: 'quickStart',
      validator: value => {
        if (typeof value === 'string') {
          return Object.keys(COMPONENT_PRESETS).includes(value);
        }
        return typeof value === 'object';
      },
    },

    // 自定义配置
    roomConfig: {
      type: Object,
      default: () => ({}),
    },

    // 自动刷新
    autoRefresh: {
      type: Boolean,
      default: true,
    },
    refreshInterval: {
      type: Number,
      default: 30000, // 30秒
    },
  });

  const emit = defineEmits([
    'update:player-name',
    'update:selected-mode',
    'create-room',
    'join-room',
    'refresh-rooms',
    'show-settings',
    'clear-error',
    'retry',
  ]);

  const showCreateRoom = ref(false);

  const {
    gameConfig,
    computedTitle,
    availableGameModes,
    preset,
    themeClass,
    emptyRoomsMessage,
  } = useLobbyConfig(props);

  const { localPlayerName, localSelectedMode } = useLobbyPlayerState({
    props,
    emit,
    availableGameModes,
  });

  const { refreshRooms, clearError, handleCreateRoom, handleJoinRoom } =
    useLobbyEvents({
      emit,
      props,
      localPlayerName,
    });

  const { startAutoRefresh, stopAutoRefresh } = useLobbyAutoRefresh(
    props,
    refreshRooms
  );

  const onCreateRoom = config => {
    handleCreateRoom(config);
    showCreateRoom.value = false;
  };

  defineExpose({
    refreshRooms,
    clearError,
    startAutoRefresh,
    stopAutoRefresh,
    gameConfig,
    availableGameModes,
  });
</script>

<style scoped>
  .multiplayer-lobby {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    transition: background-color 0.3s ease;
  }

  .theme-light {
    background-color: #f8f9fa;
    color: #212529;
  }

  .theme-dark {
    background-color: #212529;
    color: #ffffff;
  }

  .theme-auto {
    background-color: var(--bg-color, #f8f9fa);
    color: var(--text-color, #212529);
  }

  .lobby-content {
    flex: 1;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .game-icon {
    font-size: 1.5em;
    margin-right: 8px;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .lobby-content {
      padding: 15px;
    }
  }

  @media (max-width: 480px) {
    .lobby-content {
      padding: 10px;
    }
  }

  /* 动画效果 */
  .lobby-content > * {
    animation: fadeInUp 0.3s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 加载状态 */
  .multiplayer-lobby.loading {
    pointer-events: none;
    opacity: 0.7;
  }

  /* 自定义滚动条 */
  .lobby-content::-webkit-scrollbar {
    width: 8px;
  }

  .lobby-content::-webkit-scrollbar-track {
    background: var(--scrollbar-track, #f1f1f1);
  }

  .lobby-content::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb, #c1c1c1);
    border-radius: 4px;
  }

  .lobby-content::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, #a1a1a1);
  }
</style>
