<!--
  玩家列表组件 - 可复用的房间内玩家显示组件
  用于显示房间内玩家信息，包括准备状态、颜色等
-->
<template>
  <div class="player-list">
    <div class="player-list-header">
      <h4>{{ title }} ({{ players.length }}/{{ maxPlayers }})</h4>
      <slot name="header-actions" />
    </div>

    <div class="players-container">
      <PlayerCard
        v-for="player in players"
        :key="player.id || player.session_id"
        :player="player"
        :current-user="currentUser"
        :host-id="hostId"
        :can-kick="canKick"
        :action-disabled="actionDisabled"
        @kick-player="$emit('kick-player', $event)"
      >
        <template #status="{ player }">
          <slot name="player-status" :player="player" />
        </template>
        <template #actions="slotProps">
          <slot name="player-actions" v-bind="slotProps" />
        </template>
      </PlayerCard>

      <EmptySlot v-for="i in emptySlots" :key="`empty-${i}`" />
    </div>

    
  </div>
</template>

<script>
import PlayerCard from './player-list/PlayerCard.vue';
import EmptySlot from './player-list/EmptySlot.vue';
import PlayerStats from './player-list/PlayerStats.vue';

export default {
  name: 'PlayerList',
  components: { PlayerCard, EmptySlot, PlayerStats },
  props: {
    players: { type: Array, default: () => [] },
    maxPlayers: { type: Number, default: 4 },
    minPlayers: { type: Number, default: 1 },
    currentUser: { type: Object, default: null },
    hostId: { type: String, default: null },
    title: { type: String, default: '房间玩家' },
    
    canKick: { type: Boolean, default: false },
    actionDisabled: { type: Boolean, default: false }
  },
  emits: ['kick-player'],
  computed: {
    readyCount() { return this.players.filter(p => p.is_ready).length; },
    allReady() { return this.players.length > 0 && this.readyCount === this.players.length; },
    emptySlots() { return Math.max(0, this.maxPlayers - this.players.length); }
  }
}
</script>

<style scoped>
.player-list { background:#fff; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,.1); }
.player-list-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #f8f9fa; }
.player-list-header h4 { margin:0; color:#212529; font-weight:600; }
.players-container { display:flex; flex-direction:column; gap:12px; }
@media (max-width:600px){ .player-list { padding:16px; } }
</style>
