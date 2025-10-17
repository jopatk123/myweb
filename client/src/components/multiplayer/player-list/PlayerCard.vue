<template>
  <div
    class="player-card"
    :class="{
      'player-ready': player.is_ready,
      'player-host': isHost(player),
      'player-self': isSelf(player),
    }"
  >
    <!-- 头像 -->
    <div
      class="player-avatar"
      :style="{
        backgroundColor: player.player_color || getRandomColor(player),
      }"
    >
      {{ getPlayerInitial(player.player_name) }}
      <div v-if="player.is_ready" class="ready-badge">
        <span class="ready-icon">✓</span>
      </div>
      <div v-if="isHost(player)" class="host-badge">
        <span class="host-icon">👑</span>
      </div>
    </div>

    <!-- 信息 -->
    <div class="player-info">
      <div class="player-name">
        {{ player.player_name }}
        <span v-if="isSelf(player)" class="self-indicator">(我)</span>
      </div>
      <div class="player-status">
        <span v-if="player.is_ready" class="status-ready">✓ 已准备</span>
        <span v-else class="status-waiting">⏳ 等待中</span>
        <!-- 追加状态插槽 -->
        <slot name="status" :player="player" />
      </div>
    </div>

    <!-- 操作 -->
    <div class="player-actions">
      <slot name="actions" :player="player" :isHost="isHost" :isSelf="isSelf">
        <button
          v-if="
            canKick && isHost(currentUser) && !isSelf(player) && !isHost(player)
          "
          class="kick-btn"
          @click="$emit('kick-player', player)"
          :disabled="actionDisabled"
        >
          ❌
        </button>
      </slot>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'PlayerCard',
    props: {
      player: { type: Object, required: true },
      currentUser: { type: Object, default: null },
      hostId: { type: String, default: null },
      canKick: { type: Boolean, default: false },
      actionDisabled: { type: Boolean, default: false },
    },
    emits: ['kick-player'],
    methods: {
      isHost(player) {
        if (!player) return false;
        const playerId = player.id || player.session_id;
        return (
          playerId === this.hostId ||
          (this.currentUser && playerId === this.currentUser.created_by)
        );
      },
      isSelf(player) {
        if (!player || !this.currentUser) return false;
        const playerId = player.id || player.session_id;
        const currentUserId =
          this.currentUser.id || this.currentUser.session_id;
        return playerId === currentUserId;
      },
      getPlayerInitial(name) {
        return name ? name.charAt(0).toUpperCase() : '?';
      },
      getRandomColor(player) {
        const colors = [
          '#FF6B6B',
          '#4ECDC4',
          '#45B7D1',
          '#96CEB4',
          '#FFEAA7',
          '#DDA0DD',
          '#98D8C8',
          '#FFD93D',
          '#FF8C69',
          '#87CEEB',
          '#DEB887',
          '#F0E68C',
        ];
        const name = player.player_name || player.id || '';
        const index = name
          .split('')
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return colors[index % colors.length];
      },
    },
  };
</script>

<style scoped>
  .player-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: all 0.2s;
    position: relative;
  }
  .player-card:hover {
    background: #e9ecef;
  }
  .player-card.player-ready {
    border-color: #28a745;
    background: linear-gradient(135deg, #d4edda, #f8f9fa);
  }
  .player-card.player-host {
    border-color: #ffc107;
    background: linear-gradient(135deg, #fff3cd, #f8f9fa);
  }
  .player-card.player-self {
    border-color: #007bff;
    background: linear-gradient(135deg, #e7f3ff, #f8f9fa);
  }

  .player-avatar {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .ready-badge,
  .host-badge {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    font-size: 10px;
    font-weight: bold;
  }
  .ready-badge {
    top: -2px;
    right: -2px;
    background: #28a745;
    color: #fff;
  }
  .host-badge {
    top: -6px;
    left: -6px;
    background: #ffc107;
    color: #212529;
    font-size: 12px;
  }

  .player-info {
    flex: 1;
    min-width: 0;
  }
  .player-name {
    font-weight: 600;
    color: #212529;
    font-size: 16px;
    margin-bottom: 4px;
  }
  .self-indicator {
    font-weight: normal;
    color: #007bff;
    font-size: 14px;
  }
  .player-status {
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .status-ready {
    color: #28a745;
    font-weight: 600;
  }
  .status-waiting {
    color: #ffc107;
    font-weight: 500;
  }

  .player-actions {
    display: flex;
    gap: 8px;
  }
  .kick-btn {
    background: #dc3545;
    color: #fff;
    border: none;
    border-radius: 6px;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .kick-btn:hover:not(:disabled) {
    background: #c82333;
    transform: scale(1.05);
  }
  .kick-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    .player-card {
      padding: 10px;
    }
    .player-avatar {
      width: 40px;
      height: 40px;
      font-size: 16px;
    }
    .ready-badge,
    .host-badge {
      width: 16px;
      height: 16px;
      font-size: 8px;
    }
    .player-name {
      font-size: 14px;
    }
    .player-status {
      font-size: 12px;
    }
  }
</style>
