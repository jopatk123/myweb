<template>
  <div class="stats-section">
    <div class="stat-item">
      <span class="stat-label">今日工作时长</span>
      <span class="stat-value">{{ todayWorkTime }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">本周工作时长</span>
      <span class="stat-value">{{ weekWorkTime }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">总工作时长</span>
      <span class="stat-value">{{ totalWorkTime }}</span>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    todayWorkTime: { type: String, required: true },
    weekWorkTime: { type: String, required: true },
    totalWorkTime: { type: String, required: true },
  });
</script>

<style scoped>
  .stats-section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 100%;
    max-width: 300px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stat-item:last-child {
    border-bottom: none;
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  .stat-value {
    font-weight: bold;
    color: #4ade80;
  }
</style>
