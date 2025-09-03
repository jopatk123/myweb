<template>
  <div :class="['player-card', { me: isMe, ready: player.is_ready }]">
    <div class="player-avatar">
      {{ avatarText }}
    </div>
    <div class="player-info">
      <strong class="player-name">{{ player.player_name || defaultName.value }}</strong>
      <span class="player-status">
        <span class="seat-info">座位 {{ player.seat || '?' }}</span>
        <span :class="['ready-status', player.is_ready ? 'ready' : 'not-ready']">
          {{ player.is_ready ? '✅ 已准备' : '⏳ 未准备' }}
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  player: {
    type: Object,
    required: true
  },
  isMe: {
    type: Boolean,
    default: false
  }
});

const avatarText = computed(() => {
  const name = props.player.player_name || defaultName.value || '玩家';
  return name.charAt(0).toUpperCase();
});

const defaultName = computed(() => {
  return '玩家' + (props.player.seat || '?');
});
</script>

<style scoped>
.player-card {
  background: rgba(255, 255, 255, 0.15);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  border: 2px solid transparent;
  transition: all 0.2s;
  min-width: 200px;
}

.player-card.me {
  border-color: #ffd24d;
  background: rgba(255, 210, 77, 0.2);
}

.player-card.ready {
  border-color: #28a745;
  background: rgba(40, 167, 69, 0.15);
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name {
  color: #fff;
  font-weight: 600;
}

.player-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seat-info {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.ready-status {
  font-size: 12px;
  font-weight: 500;
}

.ready-status.ready {
  color: #28a745;
}

.ready-status.not-ready {
  color: #ffc107;
}
</style>
