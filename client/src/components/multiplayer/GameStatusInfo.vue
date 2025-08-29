<template>
  <div class="game-status" v-if="show">
    <div class="status-item">
      <span class="status-label">房间状态:</span>
      <span class="status-value" :class="`status-${gameStatus}`">{{ statusText }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">准备状态:</span>
      <span class="status-value">{{ readyCount }}/{{ totalPlayers }} 已准备</span>
    </div>
  </div>
</template>

<script>
const map = { waiting: '等待中', starting: '准备开始', playing: '游戏中', finished: '已结束' }
export default {
  name: 'GameStatusInfo',
  props: {
    show: { type: Boolean, default: true },
    gameStatus: { type: String, default: 'waiting' },
    readyCount: { type: Number, default: 0 },
    totalPlayers: { type: Number, default: 0 }
  },
  computed: {
    statusText() { return map[this.gameStatus] || this.gameStatus }
  }
}
</script>

<style scoped>
.game-status { margin-top:16px; padding:16px; background:#f8f9fa; border-radius:8px; display:flex; flex-direction:column; gap:8px; }
.status-item { display:flex; justify-content:space-between; align-items:center; }
.status-label { font-weight:500; color:#495057; }
.status-value { font-weight:600; }
.status-waiting { color:#ffc107; }
.status-starting { color:#17a2b8; }
.status-playing { color:#28a745; }
.status-finished { color:#6c757d; }
</style>
