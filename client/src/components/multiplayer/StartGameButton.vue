<template>
  <div class="start-game-section">
    <button 
      class="start-game-btn"
      :class="{ 'can-start': canStartGame, 'cannot-start': !canStartGame }"
      @click="onStart"
      :disabled="!canStartGame || disabled || gameStarted"
    >
      <span class="start-icon">🚀</span>
      <span class="start-text">{{ gameStarted ? '游戏进行中...' : startGameText }}</span>
    </button>
    <div class="start-hint">{{ startHintText }}</div>
  </div>
</template>

<script>
export default {
  name: 'StartGameButton',
  props: {
    canStartGame: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    gameStarted: { type: Boolean, default: false },
    startGameText: { type: String, default: '开始游戏' },
    startHintText: { type: String, default: '' }
  },
  emits: ['start-game'],
  methods: {
    onStart() {
      if (!this.canStartGame || this.disabled) return;
      this.$emit('start-game');
    }
  }
}
</script>

<style scoped>
.start-game-section { display:flex; flex-direction:column; gap:8px; }
.start-game-btn { display:flex; align-items:center; justify-content:center; gap:12px; padding:20px 40px; border:none; border-radius:10px; font-size:18px; font-weight:700; cursor:pointer; transition:all .3s; text-transform:uppercase; letter-spacing:1px; min-height:64px; position:relative; overflow:hidden; }
.start-game-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent); transition:left .6s; }
.start-game-btn.can-start { background:linear-gradient(135deg,#28a745,#20c997); color:#fff; box-shadow:0 6px 20px rgba(40,167,69,.4); }
.start-game-btn.can-start:hover:not(:disabled) { background:linear-gradient(135deg,#20c997,#17a2b8); transform:translateY(-3px); box-shadow:0 8px 25px rgba(40,167,69,.5); }
.start-game-btn.can-start:hover::before { left:100%; }
.start-game-btn.cannot-start { background:#6c757d; color:#fff; cursor:not-allowed; }
.start-icon { font-size:24px; }
.start-hint { text-align:center; font-size:14px; color:#6c757d; margin-top:8px; }
.start-game-btn:disabled { opacity:.6; cursor:not-allowed; transform:none!important; box-shadow:none!important; }
@media (max-width:600px){
  .start-game-btn { padding:16px 32px; font-size:16px; min-height:56px; }
  .start-icon { font-size:18px; }
}
</style>
