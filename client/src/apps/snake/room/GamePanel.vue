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
        
      </div>
    </div>
  </div>
</template>

<script setup>
import SharedGamePanel from './SharedGamePanel.vue'
import CompetitiveGamePanel from './CompetitiveGamePanel.vue'
// no local computed properties required

defineProps({
  room: { type: Object, required: true },
  gameState: { type: Object, required: true },
  players: { type: Array, default: () => [] },
  voteTimeout: { type: Number, default: 0 },
  myVote: { type: String, default: null },
  votes: { type: Object, default: () => ({}) }, // 兼容旧参数（已不再用于共享模式显示）
  currentPlayerId: { type: String, default: null }
})

defineEmits(['vote', 'move', 'restart'])
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
/* 共享模式 HUD */
.shared-hud { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 18px; box-shadow:0 2px 4px rgba(0,0,0,0.04); align-self:start; }
.shared-hud .hud-title { margin:0 0 12px; font-size:14px; color:#334155; letter-spacing:.5px; }
.shared-stats { display:flex; flex-direction:column; gap:8px; }
.stat-line { display:flex; justify-content:space-between; font-size:13px; background:#fff; padding:6px 10px; border-radius:6px; border:1px solid #e2e8f0; }
.stat-line .label { color:#64748b; }
.stat-line .value { font-weight:600; color:#1e293b; }
.divider { height:1px; background:#e2e8f0; margin:6px 0 2px; }
.stat-mini { font-size:11px; color:#475569; text-align:center; opacity:.85; }

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
  .shared-hud { order:2; }
}
</style>
