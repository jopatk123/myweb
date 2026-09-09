<template>
  <div class="message-board-window" @contextmenu.stop>
    <MessageBoard />
  </div>
</template>

<script setup>
  import MessageBoard from './MessageBoard.vue';
</script>

<style scoped>
  .message-board-window {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
