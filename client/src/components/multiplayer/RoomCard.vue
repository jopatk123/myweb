<!--
  房间卡片组件 - 可复用的房间显示组件
  用于在大厅显示房间信息，支持加入/观战操作
-->
<template>
  <div class="room-card" :class="cardClasses">
    <RoomCardHeader
      :room="room"
      :mode-class="modeClass"
      :mode-icon="modeIcon"
      :mode-label="modeLabel"
    >
      <template #mode-icon="slotProps">
        <slot name="mode-icon" v-bind="slotProps" />
      </template>
    </RoomCardHeader>

    <div class="room-info">
      <div class="player-count">
        <span class="count"
          >{{ room.current_players }}/{{ room.max_players }}</span
        >
        <span class="label">玩家</span>
      </div>
      <div class="room-status">
        <span class="status" :class="statusClass">
          {{ statusText }}
        </span>
      </div>
    </div>

    <RoomCardPlayers
      :players="visiblePlayers"
      :overflow-count="overflowCount"
      :get-player-initial="getPlayerInitial"
      :get-player-title="getPlayerTitle"
    />

    <RoomCardActions
      :can-join="canJoin"
      :can-spectate="canSpectate"
      :join-button-text="joinButtonText"
      :disabled="disabled"
      :get-disabled-text="getDisabledButtonText"
      @join="onJoin"
      @spectate="onSpectate"
    />
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import RoomCardHeader from './room-card/RoomCardHeader.vue';
  import RoomCardPlayers from './room-card/RoomCardPlayers.vue';
  import RoomCardActions from './room-card/RoomCardActions.vue';
  import { useRoomCard } from '@/composables/multiplayer/useRoomCard.js';

  const props = defineProps({
    room: {
      type: Object,
      required: true,
      validator: room => {
        return (
          room &&
          typeof room.room_code === 'string' &&
          typeof room.status === 'string' &&
          typeof room.mode === 'string'
        );
      },
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    maxVisiblePlayers: {
      type: Number,
      default: 4,
    },
    joinButtonText: {
      type: String,
      default: '加入',
    },
    modeConfig: {
      type: Object,
      default: () => ({
        shared: { icon: '🤝', label: '共享' },
        competitive: { icon: '⚔️', label: '竞技' },
      }),
    },
  });

  const emit = defineEmits(['join', 'spectate']);

  const {
    visiblePlayers,
    overflowCount,
    canJoin,
    canSpectate,
    modeClass,
    statusClass,
    statusText,
    getModeIcon,
    getModeLabel,
    getDisabledButtonText,
    getPlayerInitial,
    getPlayerTitle,
  } = useRoomCard(props);

  const cardClasses = computed(() => ({
    'room-full': props.room.current_players >= props.room.max_players,
    'room-playing': props.room.status === 'playing',
    'room-finished': props.room.status === 'finished',
  }));

  const modeIcon = computed(() => getModeIcon(props.room.mode));
  const modeLabel = computed(() => getModeLabel(props.room.mode));

  const onJoin = () => emit('join', props.room.room_code);
  const onSpectate = () => emit('spectate', props.room.room_code);
</script>

<style scoped>
  .room-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border: 2px solid #e9ecef;
    border-radius: 12px;
    padding: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .room-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #007bff, #28a745);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .room-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 123, 255, 0.15);
    border-color: #007bff;
  }

  .room-card:hover::before {
    opacity: 1;
  }

  .room-card.room-full {
    opacity: 0.7;
    border-color: #ffc107;
  }

  .room-card.room-playing::before {
    background: linear-gradient(90deg, #28a745, #20c997);
    opacity: 1;
  }

  .room-card.room-finished {
    opacity: 0.6;
    border-color: #6c757d;
  }

  .room-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .player-count {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .player-count .count {
    font-size: 16px;
    font-weight: bold;
    color: #007bff;
  }

  .player-count .label {
    font-size: 12px;
    color: #6c757d;
  }

  .room-status .status {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-waiting {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  }

  .status-playing {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .status-finished {
    background: #d6d8db;
    color: #383d41;
    border: 1px solid #c6c8ca;
  }
</style>
