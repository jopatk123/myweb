<template>
  <div class="room-players">
    <div
      v-for="player in players"
      :key="player.id || player.session_id"
      class="player-avatar"
      :style="{ backgroundColor: player.player_color }"
      :title="getPlayerTitle(player)"
    >
      {{ getPlayerInitial(player.player_name) }}
      <span v-if="player.is_ready" class="ready-indicator">✓</span>
    </div>
    <div v-if="overflowCount > 0" class="more-players">
      +{{ overflowCount }}
    </div>
  </div>
</template>

<script setup>
  defineProps({
    players: {
      type: Array,
      default: () => [],
    },
    overflowCount: {
      type: Number,
      default: 0,
    },
    getPlayerInitial: {
      type: Function,
      required: true,
    },
    getPlayerTitle: {
      type: Function,
      required: true,
    },
  });
</script>

<style scoped>
  .room-players {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .player-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    position: relative;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
  }

  .player-avatar:hover {
    transform: scale(1.1);
  }

  .ready-indicator {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 14px;
    height: 14px;
    background: #28a745;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: bold;
    border: 1px solid white;
  }

  .more-players {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #6c757d;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    border: 2px solid white;
  }
</style>
