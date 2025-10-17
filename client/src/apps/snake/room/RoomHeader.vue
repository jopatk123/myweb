<template>
  <div class="room-header">
    <div class="room-info">
      <h2>
        🏠 房间
        <span class="room-code">{{ roomCode }}</span>
        <span v-if="playerDisplayName" class="player-name">
          <span
            class="player-color-dot"
            :style="{ background: playerColor || '#ffffff' }"
          ></span>
          <span class="player-name-text">{{ playerDisplayName }}</span>
        </span>
      </h2>
      <div class="room-details">
        <span class="mode-badge" :class="`mode-${room?.mode}`">
          {{ room?.mode === 'shared' ? '🤝 共享模式' : '⚔️ 竞技模式' }}
        </span>
        <span class="status-badge" :class="`status-${gameStatus}`">
          {{ getStatusText(gameStatus) }}
        </span>
      </div>
    </div>
    <div class="room-actions">
      <button class="btn-secondary" @click="$emit('copy-room-code')">
        📋 复制房间码
        <span class="copy-hint">{{
          room?.room_code || room?.roomCode
            ? room?.room_code || room?.roomCode
            : ''
        }}</span>
      </button>
      <button class="btn-danger" @click="$emit('leave-room')">
        🚪 离开房间
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    room: { type: Object, default: null },
    gameStatus: { type: String, default: 'waiting' },
    currentPlayer: { type: Object, default: null },
  });

  defineEmits(['copy-room-code', 'leave-room']);

  const roomCode = computed(
    () => props.room?.room_code || props.room?.roomCode || '——'
  );

  const playerDisplayName = computed(() => {
    const p = props.currentPlayer || {};
    return p.player_name || p.playerName || p.name || '';
  });

  const playerColor = computed(() => {
    const p = props.currentPlayer || {};
    // 常见字段名：player_color / playerColor / color / hex
    return p.player_color || p.playerColor || p.color || p.hex || '';
  });

  const getStatusText = status => {
    const statusMap = {
      waiting: '等待开始',
      playing: '游戏中',
      finished: '游戏结束',
    };
    return statusMap[status] || status;
  };
</script>

<style scoped>
  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 25px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    color: white;
  }

  .room-info h2 {
    margin: 0 0 10px 0;
    font-size: 24px;
    font-weight: 600;
  }

  .room-details {
    display: flex;
    gap: 15px;
  }

  .mode-badge,
  .status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  .mode-shared {
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.3);
  }

  .mode-competitive {
    background: rgba(233, 30, 99, 0.2);
    border: 1px solid rgba(233, 30, 99, 0.3);
  }

  .status-waiting {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.3);
  }

  .status-playing {
    background: rgba(255, 152, 0, 0.2);
    border: 1px solid rgba(255, 152, 0, 0.3);
  }

  .status-finished {
    background: rgba(158, 158, 158, 0.2);
    border: 1px solid rgba(158, 158, 158, 0.3);
  }

  .room-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end; /* stack on the right side on larger screens */
  }

  .player-name {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: 8px;
    font-size: 28px;
  }
  .player-color-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-block;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  .player-name-text {
    font-weight: 700;
    color: #f6c84c;
  }

  .btn-secondary,
  .btn-danger {
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    backdrop-filter: blur(10px);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  .btn-danger {
    background: rgba(244, 67, 54, 0.8);
    color: white;
    border: 1px solid rgba(244, 67, 54, 0.3);
  }

  .btn-danger:hover {
    background: rgba(244, 67, 54, 1);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .room-header {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }

    .room-actions {
      width: 100%;
      align-items: center; /* center stacked buttons on mobile */
    }
  }
</style>
