<template>
  <div class="players-section">
    <div class="section-header">
      <h3>👥 玩家列表 ({{ players.length }}/{{ room?.max_players }})</h3>
      <div class="ready-status">
        {{ readyCount }}/{{ players.length }} 准备就绪
      </div>
    </div>

    <div class="players-list">
      <PlayerCard
        v-for="player in players" 
        :key="player.session_id"
        :player="player"
        :currentPlayer="currentPlayer"
        :room="room"
        @kick="$emit('kick-player', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import PlayerCard from './PlayerCard.vue'

defineProps({
  players: { type: Array, default: () => [] },
  currentPlayer: { type: Object, default: null },
  room: { type: Object, default: null },
  readyCount: { type: Number, default: 0 }
})

defineEmits(['kick-player'])
</script>

<style scoped>
.players-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.ready-status {
  color: #667eea;
  font-weight: 500;
  background: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
