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
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    color: white;
    margin-bottom: 8px;
    gap: 12px;
    flex-shrink: 0;
    text-align: left;
  }

  .header-title {
    font-size: 1.2rem;
    margin: 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    font-weight: bold;
  }

  .header-stats {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: nowrap;
  }

  .stat-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.08);
    padding: 4px 8px;
    border-radius: 8px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    min-width: auto;
  }

  .stat-label {
    font-size: 0.75rem;
    opacity: 0.85;
    margin: 0;
    font-weight: 500;
    white-space: nowrap;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 700;
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
      font-size: 1.1rem;
    }

    .header-stats {
      gap: 6px;
      flex-wrap: wrap;
    }

    .stat-item {
      padding: 4px 8px;
    }

    .stat-value {
      font-size: 1rem;
    }
  }
</style>
