<template>
  <div class="notebook-header">
    <div class="header-top">
      <h2 class="header-title">笔记本</h2>
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
    <div
      v-if="totalCount > 0"
      class="header-progress"
      role="progressbar"
      aria-label="完成进度"
      :aria-valuenow="progressPercent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="header-progress-fill"
        :style="{ width: `${progressPercent}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
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

  const progressPercent = computed(() =>
    props.totalCount > 0
      ? Math.round((props.completedCount / props.totalCount) * 100)
      : 0
  );
</script>

<style scoped>
  .notebook-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: white;
    margin-bottom: 8px;
    flex-shrink: 0;
    text-align: left;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
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

  .header-progress {
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.15);
    overflow: hidden;
  }

  .header-progress-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    transition: width 0.3s ease;
  }

  @media (max-width: 768px) {
    .header-title {
      font-size: 1.1rem;
    }

    .header-stats {
      gap: 6px;
      flex-wrap: wrap;
    }

    .stat-value {
      font-size: 1rem;
    }
  }
</style>
