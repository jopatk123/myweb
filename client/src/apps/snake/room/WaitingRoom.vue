<template>
  <div class="waiting-room">
    <div class="room-grid">
      <!-- 玩家列表 -->
      <PlayersSection
        :players="players"
        :currentPlayer="currentPlayer"
        :room="room"
        :readyCount="readyCount"
        @kick-player="$emit('kick-player', $event)"
      />

      <!-- 游戏设置 -->
      <GameSettings 
        :room="room"
        :gameState="gameState"
      />

      <!-- 准备控制 -->
      <ReadyControls
        :isReady="isReady"
        :canStartGame="canStartGame"
        :isHost="room?.created_by === currentPlayer?.session_id"
        @toggle-ready="$emit('toggle-ready')"
        @start-game="$emit('start-game')"
      />
    </div>
  </div>
</template>

<script setup>
import PlayersSection from './PlayersSection.vue'
import GameSettings from './GameSettings.vue'
import ReadyControls from './ReadyControls.vue'

defineProps({
  room: { type: Object, default: null },
  players: { type: Array, default: () => [] },
  currentPlayer: { type: Object, default: null },
  gameState: { type: Object, default: null },
  isReady: { type: Boolean, default: false },
  readyCount: { type: Number, default: 0 },
  canStartGame: { type: Boolean, default: false }
})

defineEmits(['toggle-ready', 'start-game', 'kick-player'])
</script>

<style scoped>
.waiting-room {
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  padding: 25px;
}

.room-grid {
  display: grid;
  gap: 25px;
  grid-template-columns: 2fr 1fr;
}

@media (max-width: 1024px) {
  .room-grid {
    grid-template-columns: 1fr;
  }
}
</style>
