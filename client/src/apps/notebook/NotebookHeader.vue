<template>
  <div class="notebook-header">
    <h2 class="header-title">📔 笔记本</h2>
    <div class="header-stats">
      <div class="stat-item">
        <span class="stat-label">总计</span>
        <span class="stat-value">{{ totalCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">待办</span>
        <span class="stat-value pending">{{ pendingCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已完成</span>
        <span class="stat-value completed">{{ completedCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    totalCount: {
      type: Number,
      default: 0,
    },
    pendingCount: {
      type: Number,
      default: 0,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
  });
</script>

<style scoped>
  .notebook-header {
    text-align: center;
    color: white;
    margin-bottom: 20px;
  }

  .header-title {
    font-size: 2rem;
    margin: 0 0 16px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    font-weight: bold;
  }

  .header-stats {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 16px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: 60px;
  }

  .stat-label {
    font-size: 0.8rem;
    opacity: 0.8;
    margin-bottom: 4px;
    font-weight: 500;
  }

  .stat-value {
    font-size: 1.4rem;
    font-weight: bold;
    color: #ffffff;
  }

  .stat-value.pending {
    color: #fbbf24;
  }

  .stat-value.completed {
    color: #4ade80;
  }

  @media (max-width: 768px) {
    .header-title {
      font-size: 1.6rem;
    }

    .header-stats {
      gap: 12px;
    }

    .stat-item {
      padding: 6px 12px;
    }

    .stat-value {
      font-size: 1.2rem;
    }
  }
</style>
