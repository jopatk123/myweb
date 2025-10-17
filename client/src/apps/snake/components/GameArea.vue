<template>
  <div class="game-layout" :class="`layout-${room.mode}`">
    <!-- 共享模式游戏区域 -->
    <SharedGameArea
      v-if="room.mode === 'shared'"
      :room="room"
      :players="players"
      :gameState="gameState"
      @vote="$emit('vote', $event)"
    />

    <!-- 竞技模式游戏区域 -->
    <CompetitiveGameArea
      v-else-if="room.mode === 'competitive'"
      :room="room"
      :player="player"
      :players="players"
      :gameState="gameState"
      @move="$emit('move', $event)"
    />
  </div>
</template>

<script setup>
  import SharedGameArea from './SharedGameArea.vue';
  import CompetitiveGameArea from './CompetitiveGameArea.vue';

  defineProps({
    room: {
      type: Object,
      required: true,
    },
    player: {
      type: Object,
      required: true,
    },
    players: {
      type: Array,
      required: true,
    },
    gameState: {
      type: Object,
      required: true,
    },
  });

  defineEmits(['vote', 'move']);
</script>

<style scoped>
  .game-layout {
    display: grid;
    gap: 20px;
    height: 100%;
  }

  .layout-shared {
    grid-template-columns: 1fr 400px;
  }

  .layout-competitive {
    grid-template-columns: 1fr;
  }

  /* 响应式设计 */
  @media (max-width: 1200px) {
    .layout-shared {
      grid-template-columns: 1fr;
    }
  }
</style>
