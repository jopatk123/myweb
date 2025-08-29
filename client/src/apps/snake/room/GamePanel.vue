<template>
  <div class="game-panel-wrapper">
    <div v-if="room?.mode === 'shared'" class="shared-wrapper">
      <SharedGamePanel 
        :game-state="gameState" 
        :vote-countdown="voteTimeout" 
        :my-vote="myVote" 
        @vote="$emit('vote', $event)" 
      />
      <VotersDisplay 
        :votes="votes" 
        class="mt-12" 
      />
    </div>
    <div v-else class="competitive-wrapper">
      <CompetitiveGamePanel 
        :game-state="gameState" 
        @move="$emit('move', $event)" 
      />
    </div>
  </div>
</template>

<script setup>
import SharedGamePanel from './SharedGamePanel.vue'
import VotersDisplay from './VotersDisplay.vue'
import CompetitiveGamePanel from './CompetitiveGamePanel.vue'

defineProps({
  room: { type: Object, required: true },
  gameState: { type: Object, required: true },
  voteTimeout: { type: Number, default: 0 },
  myVote: { type: String, default: null },
  votes: { type: Object, default: () => ({}) }
})

defineEmits(['vote', 'move'])
</script>

<style scoped>
.game-panel-wrapper {
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
}

.shared-wrapper {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  padding: 25px;
}

.competitive-wrapper {
  padding: 25px;
}

.mt-12 {
  margin-top: 12px;
}

@media (max-width: 1024px) {
  .shared-wrapper {
    grid-template-columns: 1fr;
  }
}
</style>
