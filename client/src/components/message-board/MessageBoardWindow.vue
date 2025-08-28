<template>
  <div class="message-board-window">
    <MessageBoard @close="$emit('close')" />
  </div>
</template>

<script setup>
  import MessageBoard from './MessageBoard.vue';

  // 组件事件
  const emit = defineEmits(['close']);
</script>

<style scoped>
  .message-board-window {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
