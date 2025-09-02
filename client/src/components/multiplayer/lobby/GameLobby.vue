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

    <ErrorMessage 
      :error="error" 
      :auto-clear="5000"
      @clear-error="clearError" 
    />

    <ConnectionStatus 
      v-if="!isConnected && !loading" 
      :connecting="connecting"
      :game-type="gameType"
      @retry="$emit('retry')"
    />

    <div v-else class="lobby-content">
      <QuickStart
        v-if="preset.showQuickJoin || preset.showCreateRoom"
        v-model:player-name="localPlayerName"
        v-model:selected-mode="localSelectedMode"
        :player-name-placeholder="playerNamePlaceholder"
        :game-modes="availableGameModes"
        :loading="loading"
        :show-mode-selector="preset.showModeSelector"
        :show-player-count="preset.showPlayerCount"
        :show-quick-join="preset.showQuickJoin"
        :show-create-room="preset.showCreateRoom"
        :game-config="gameConfig"
        @quick-join="handleQuickJoin"
        @show-create-room="showCreateRoom = true"
      >
        <template #mode-selector="{ selectedMode, onModeChange }">
          <slot 
            name="mode-selector" 
            :selected-mode="selectedMode" 
            :on-mode-change="onModeChange"
            :available-modes="availableGameModes"
          />
        </template>

        <template #extra-controls>
          <slot name="quick-start-controls" />
        </template>
      </QuickStart>

      <RoomList
        :active-rooms="activeRooms"
        :game-modes="availableGameModes"
        :game-config="gameConfig"
        :loading="loading"
        :empty-message="emptyRoomsMessage"
        @join-room="handleJoinRoom"
        @refresh="refreshRooms"
      >
        <template #room-mode="{ room }">
          <slot name="room-mode" :room="room" />
        </template>

        <template #room-extra="{ room }">
          <slot name="room-extra" :room="room" />
        </template>

        <template #room-actions="{ room }">
          <slot name="room-actions" :room="room" />
        </template>
      </RoomList>
    </div>

    <CreateRoomModal
      v-if="showCreateRoom"
      :game-modes="availableGameModes"
      :game-config="gameConfig"
      :loading="loading"
      :initial-config="roomConfig"
      :player-name="localPlayerName"
      @close="showCreateRoom = false"
      @create-room="handleCreateRoom"
    >
      <template #create-room-form="{ roomConfig, onConfigChange }">
        <slot 
          name="create-room-form" 
          :room-config="roomConfig" 
          :on-config-change="onConfigChange"
          :game-config="gameConfig"
        />
      </template>

      <template #advanced-settings="{ roomConfig, onConfigChange }">
        <slot 
          name="advanced-settings"
          :room-config="roomConfig"
          :on-config-change="onConfigChange"
        />
      </template>
    </CreateRoomModal>

    <!-- 自定义模态框插槽 -->
    <slot name="modals" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import LobbyHeader from './LobbyHeader.vue';
import ErrorMessage from './ErrorMessage.vue';
import ConnectionStatus from './ConnectionStatus.vue';
import QuickStart from './QuickStart.vue';
import RoomList from './RoomList.vue';
import CreateRoomModal from './CreateRoomModal.vue';
import { 
  gameUtils, 
  COMPONENT_PRESETS,
  DEFAULT_GAME_MODES,
  multiplayerEvents
} from '../index.js';

const props = defineProps({
  // 基础配置
  title: {
    type: String,
    default: null // 如果为空，将根据游戏类型自动生成
  },
  gameType: {
    type: String,
    default: 'default'
  },
  
  // 玩家设置
  playerName: {
    type: String,
    default: ''
  },
  playerNamePlaceholder: {
    type: String,
    default: '输入您的昵称'
  },
  
  // 游戏模式
  gameModes: {
    type: Array,
    default: null // 如果为空，将根据游戏类型自动获取
  },
  selectedMode: {
    type: String,
    default: null
  },
  
  // 状态
  isConnected: {
    type: Boolean,
    default: false
  },
  connecting: {
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
  },
  
  // 房间列表
  activeRooms: {
    type: Array,
    default: () => []
  },
  
  // 主题和样式
  theme: {
    type: String,
    default: 'light',
    validator: value => ['light', 'dark', 'auto'].includes(value)
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
    }
  },
  
  // 自定义配置
  roomConfig: {
    type: Object,
    default: () => ({})
  },
  
  // 自动刷新
  autoRefresh: {
    type: Boolean,
    default: true
  },
  refreshInterval: {
    type: Number,
    default: 30000 // 30秒
  }
});

const emit = defineEmits([
  'quick-join',
  'create-room', 
  'join-room',
  'refresh-rooms',
  'show-settings',
  'clear-error',
  'retry',
  'update:player-name',
  'update:selected-mode'
]);

// 本地状态
const localPlayerName = ref(props.playerName);
const localSelectedMode = ref('');
const showCreateRoom = ref(false);
const refreshTimer = ref(null);

// 计算属性
const gameConfig = computed(() => gameUtils.getGameConfig(props.gameType));

const computedTitle = computed(() => {
  return props.title || `${gameConfig.value.name}多人游戏`;
});

const availableGameModes = computed(() => {
  if (props.gameModes) {
    return props.gameModes;
  }
  return gameUtils.getAvailableModes(props.gameType, DEFAULT_GAME_MODES);
});

const preset = computed(() => {
  if (typeof props.preset === 'string') {
    return { ...COMPONENT_PRESETS[props.preset] };
  }
  return { ...COMPONENT_PRESETS.quickStart, ...props.preset };
});

const themeClass = computed(() => {
  return `theme-${props.theme}`;
});

const emptyRoomsMessage = computed(() => {
  return `暂无${gameConfig.value.name}房间，点击"创建房间"开始游戏`;
});

// 监听器
watch(() => props.playerName, (newValue) => {
  localPlayerName.value = newValue;
});

watch(localPlayerName, (newValue) => {
  emit('update:player-name', newValue);
});

watch(() => props.selectedMode, (newValue) => {
  if (newValue) {
    localSelectedMode.value = newValue;
  }
});

watch(localSelectedMode, (newValue) => {
  emit('update:selected-mode', newValue);
});

// 初始化选中模式
watch(availableGameModes, (modes) => {
  if (modes.length > 0 && !localSelectedMode.value) {
    localSelectedMode.value = props.selectedMode || modes[0]?.value || 'competitive';
  }
}, { immediate: true });

// 方法
const handleQuickJoin = () => {
  const validation = gameUtils.validatePlayerName(localPlayerName.value);
  if (!validation.isValid) {
    multiplayerEvents.emit('show-toast', {
      type: 'error',
      message: validation.message
    });
    return;
  }
  
  emit('quick-join', {
    playerName: validation.formatted,
    mode: localSelectedMode.value,
    gameType: props.gameType
  });
};

const handleCreateRoom = (config) => {
  const validation = gameUtils.validatePlayerName(localPlayerName.value);
  if (!validation.isValid) {
    multiplayerEvents.emit('show-toast', {
      type: 'error',
      message: validation.message
    });
    return;
  }
  
  emit('create-room', {
    playerName: validation.formatted,
    gameType: props.gameType,
    ...config
  });
  showCreateRoom.value = false;
};

const handleJoinRoom = (roomCode) => {
  const validation = gameUtils.validatePlayerName(localPlayerName.value);
  if (!validation.isValid) {
    multiplayerEvents.emit('show-toast', {
      type: 'error',
      message: validation.message
    });
    return;
  }
  
  emit('join-room', {
    playerName: validation.formatted,
    roomCode,
    gameType: props.gameType
  });
};

const refreshRooms = () => {
  emit('refresh-rooms');
};

const clearError = () => {
  emit('clear-error');
};

// 自动刷新房间列表
const startAutoRefresh = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer.value = setInterval(() => {
      if (props.isConnected && !props.loading) {
        refreshRooms();
      }
    }, props.refreshInterval);
  }
};

const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
};

// 生命周期
onMounted(() => {
  refreshRooms();
  startAutoRefresh();
  
  // 监听连接状态变化
  watch(() => props.isConnected, (connected) => {
    if (connected) {
      refreshRooms();
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
});

// 清理定时器
const { scope } = getCurrentScope?.() || {};
if (scope) {
  scope.stop = () => {
    stopAutoRefresh();
  };
}

// 暴露给父组件的方法
defineExpose({
  refreshRooms,
  clearError,
  startAutoRefresh,
  stopAutoRefresh,
  gameConfig,
  availableGameModes
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