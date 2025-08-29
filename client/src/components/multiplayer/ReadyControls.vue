<!--
  准备控制组件 - 处理玩家准备状态和开始游戏的控制
  用于房间中的准备/开始游戏功能
-->
<template>
  <div class="ready-controls">
    <!-- 普通玩家 或 房主准备按钮 -->
    <ReadyButton
      :isReady="isReady"
      :disabled="disabled"
      :gameStarted="gameStarted"
      :isHost="isHost"
      :readyText="readyText"
      :readyActiveText="readyActiveText"
      :hint="isHost ? hostReadyHint : readyHintText"
      @toggle-ready="toggleReady"
    />

    <!-- 仅房主显示开始游戏按钮 & 额外控制 -->
    <template v-if="isHost">
      <StartGameButton
        :canStartGame="canStartGame"
        :disabled="disabled"
        :gameStarted="gameStarted"
        :startGameText="startGameText"
        :startHintText="startHintText"
        @start-game="startGame"
      />
      <div v-if="showExtraControls" class="extra-controls">
        <slot name="host-controls" :room="room" :players="players" />
      </div>
    </template>

    <GameStatusInfo
      :show="showGameStatus"
      :gameStatus="gameStatus"
      :readyCount="readyCount"
      :totalPlayers="totalPlayers"
    />

    <CountdownOverlay :countdown="countdown" />
  </div>
</template>

<script>
import ReadyButton from './ReadyButton.vue'
import StartGameButton from './StartGameButton.vue'
import GameStatusInfo from './GameStatusInfo.vue'
import CountdownOverlay from './CountdownOverlay.vue'

export default {
  name: 'ReadyControls',
  components: { ReadyButton, StartGameButton, GameStatusInfo, CountdownOverlay },
  props: {
    isHost: { type: Boolean, default: false },
    isReady: { type: Boolean, default: false },
    room: { type: Object, default: null },
    players: { type: Array, default: () => [] },
    gameStatus: { type: String, default: 'waiting' },
    disabled: { type: Boolean, default: false },
    showExtraControls: { type: Boolean, default: true },
    showGameStatus: { type: Boolean, default: true },
    minPlayers: { type: Number, default: 1 },
    countdown: { type: Number, default: 0 },
    readyText: { type: String, default: '准备' },
    readyActiveText: { type: String, default: '已准备' },
    startGameText: { type: String, default: '开始游戏' }
  },
  emits: ['toggle-ready', 'start-game'],
  computed: {
    totalPlayers() { return this.players.length },
    readyCount() { return this.players.filter(p => p.is_ready).length },
    allPlayersReady() { return this.totalPlayers > 0 && this.readyCount === this.totalPlayers },
    canStartGame() { return this.isHost && this.allPlayersReady && this.totalPlayers >= this.minPlayers && this.gameStatus === 'waiting' },
    gameStarted() { return ['starting','playing'].includes(this.gameStatus) },
    readyHintText() {
      if (this.gameStarted) return '游戏已开始'
      if (this.isReady) return '等待其他玩家准备...'
      return '点击按钮表示准备就绪'
    },
    startHintText() {
      if (this.gameStarted) return '游戏进行中'
      if (this.totalPlayers < this.minPlayers) return `需要至少 ${this.minPlayers} 名玩家`
      if (!this.allPlayersReady) return `等待 ${this.totalPlayers - this.readyCount} 名玩家准备`
      return '所有玩家已准备，可以开始游戏'
    },
    hostReadyHint() { return this.readyHintText }
  },
  methods: {
    toggleReady() { if (this.disabled || this.gameStarted) return; this.$emit('toggle-ready') },
    startGame() { if (!this.canStartGame || this.disabled) return; this.$emit('start-game') }
  }
}
</script>

<style scoped>
.ready-controls { background:#fff; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,.1); position:relative; display:flex; flex-direction:column; gap:16px; }
.extra-controls { padding-top:16px; border-top:2px solid #f8f9fa; }
@media (max-width:600px){ .ready-controls { padding:16px; } }
</style>
