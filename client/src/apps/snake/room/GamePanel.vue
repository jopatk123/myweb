<template>
  <div class="game-panel-wrapper">
    <div v-if="room?.mode === 'shared'" class="shared-wrapper">
      <SharedGamePanel 
        :game-state="gameState" 
        :players="players" 
        :vote-countdown="voteTimeout" 
        :my-vote="myVote" 
        @vote="$emit('vote', $event)" 
        @restart="$emit('restart')"
      />
      <VotersDisplay 
        :votes="votes" 
        class="mt-12" 
      />
    </div>
    <div v-else class="competitive-wrapper">
      <div class="competitive-layout">
        <div class="board-area">
          <CompetitiveGamePanel 
            :game-state="gameState" 
            :current-player-id="currentPlayerId" 
            @move="$emit('move', $event)" 
            @restart="$emit('restart')"
          />
        </div>
        <div class="side-hud" v-if="gameState?.mode === 'competitive'">
          <h5 class="hud-title">当前分数</h5>
          <div class="hud-list">
            <div v-for="(s, idx) in snakeArray" :key="s.player?.session_id" class="hud-item" :class="{ active: s.player?.session_id === currentPlayerId, dead: s.gameOver }">
              <span class="dot" :style="{ background: s.player?.player_color || fallbackColor(idx) }"></span>
              <span class="name" :title="s.player?.player_name">{{ s.player?.player_name || '玩家' }}</span>
              <span class="score">{{ s.score }}</span>
              <span class="food">🍎 {{ s.score/10 }}</span>
            </div>
          </div>
          <div class="totals" v-if="snakeArray.length">
            <div>总分: {{ totalScore }}</div>
            <div>总食物: {{ totalFood }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SharedGamePanel from './SharedGamePanel.vue'
import VotersDisplay from './VotersDisplay.vue'
import CompetitiveGamePanel from './CompetitiveGamePanel.vue'
import { computed } from 'vue'

const props = defineProps({
  room: { type: Object, required: true },
  gameState: { type: Object, required: true },
  players: { type: Array, default: () => [] },
  voteTimeout: { type: Number, default: 0 },
  myVote: { type: String, default: null },
  votes: { type: Object, default: () => ({}) },
  currentPlayerId: { type: String, default: null }
})

defineEmits(['vote', 'move', 'restart'])

const snakeArray = computed(() => {
  const snakes = props.gameState?.snakes || {};
  return Object.values(snakes);
});
function fallbackColor(i){ return ['#4ade80','#60a5fa','#f472b6','#facc15'][i % 4]; }
const totalScore = computed(()=> snakeArray.value.reduce((a,b)=> a + (b.score||0),0));
const totalFood = computed(()=> totalScore.value / 10);
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

.competitive-layout { display: flex; gap: 22px; align-items: flex-start; }
.board-area { flex: 0 0 auto; }
.side-hud { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; width:230px; box-shadow:0 2px 4px rgba(0,0,0,0.05); position:relative; }
.hud-title { margin:0 0 10px; font-size:14px; letter-spacing:.5px; color:#334155; }
.hud-list { display:flex; flex-direction:column; gap:6px; max-height:300px; overflow:auto; }
.hud-item { display:grid; grid-template-columns:14px 1fr 48px 62px; align-items:center; gap:6px; padding:4px 6px; border-radius:6px; background:#fff; font-size:12px; }
.hud-item.active { outline:2px solid #6366f1; }
.hud-item.dead { opacity:.45; text-decoration:line-through; }
.hud-item .dot { width:14px; height:14px; border-radius:50%; box-shadow:0 0 4px rgba(0,0,0,0.2); }
.hud-item .name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hud-item .score { font-weight:600; text-align:right; }
.hud-item .food { text-align:right; font-size:11px; color:#475569; }
.totals { margin-top:10px; font-size:12px; display:flex; justify-content:space-between; color:#334155; font-weight:600; }

.mt-12 {
  margin-top: 12px;
}

@media (max-width: 1024px) {
  .shared-wrapper {
    grid-template-columns: 1fr;
  }
}
</style>
