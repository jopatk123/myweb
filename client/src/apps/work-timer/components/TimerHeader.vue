<template>
  <div class="timer-header">
    <h2 class="timer-title">🕐 下班计时器</h2>
    <div class="current-time">{{ currentTime }}</div>
  </div>
</template>

<script setup>
  defineProps({
    currentTime: { type: String, required: true },
  });
</script>

<style scoped>
  .timer-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .timer-title {
    font-size: 1.8rem;
    margin: 0 0 8px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .current-time {
    font-size: 1.2rem;
    opacity: 0.9;
    font-family: 'Courier New', monospace;
  }

  @media (max-width: 768px) {
    .timer-title {
      font-size: 1.5rem;
    }
  }
</style>
