<template>
  <div
    class="player-card"
    :class="{
      'is-me': player.session_id === currentPlayer?.session_id,
      'is-ready': player.is_ready,
      'is-host': room?.created_by === player.session_id,
    }"
  >
    <div
      class="player-avatar"
      :style="{ backgroundColor: player.player_color }"
    >
      {{ player.player_name.charAt(0).toUpperCase() }}
    </div>

    <div class="player-info">
      <div class="player-name">
        {{ player.player_name }}
        <span v-if="room?.created_by === player.session_id" class="host-badge"
          >👑</span
        >
        <span
          v-if="player.session_id === currentPlayer?.session_id"
          class="me-badge"
          >我</span
        >
      </div>
      <div class="player-stats">加入于 {{ formatTime(player.joined_at) }}</div>
    </div>

    <div class="player-status">
      <div v-if="player.is_ready" class="ready-indicator">✅ 准备就绪</div>
      <div v-else class="not-ready-indicator">⏳ 未准备</div>
    </div>

    <!-- 房主踢人按钮 -->
    <div
      v-if="
        room?.created_by === currentPlayer?.session_id &&
        player.session_id !== currentPlayer?.session_id
      "
      class="player-actions"
    >
      <button
        class="kick-btn"
        @click="$emit('kick', player.session_id)"
        title="踢出玩家"
      >
        ❌
      </button>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    player: { type: Object, required: true },
    currentPlayer: { type: Object, default: null },
    room: { type: Object, default: null },
  });

  defineEmits(['kick']);

  const formatTime = timestamp => {
    return new Date(timestamp).toLocaleTimeString();
  };
</script>

<style scoped>
  .player-card {
    display: flex;
    align-items: center;
    padding: 16px;
    background: white;
    border-radius: 12px;
    gap: 16px;
    transition: all 0.3s;
    border: 2px solid transparent;
  }

  .player-card.is-me {
    border-color: #667eea;
    background: #f8f9ff;
  }

  .player-card.is-ready {
    background: #f0fff4;
  }

  .player-card.is-host {
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  }

  .player-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
  }

  .player-info {
    flex: 1;
  }

  .player-name {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .host-badge {
    font-size: 14px;
  }

  .me-badge {
    background: #667eea;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
  }

  .player-stats {
    color: #666;
    font-size: 14px;
  }

  .player-status {
    text-align: right;
  }

  .ready-indicator {
    color: #2ed573;
    font-weight: 500;
    font-size: 14px;
  }

  .not-ready-indicator {
    color: #ffa502;
    font-weight: 500;
    font-size: 14px;
  }

  .player-actions {
    display: flex;
    align-items: center;
  }

  .kick-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.3s;
  }

  .kick-btn:hover {
    background: rgba(244, 67, 54, 0.1);
  }

  @media (max-width: 768px) {
    .player-card {
      padding: 12px;
      gap: 12px;
    }

    .player-avatar {
      width: 40px;
      height: 40px;
      font-size: 16px;
    }
  }
</style>
