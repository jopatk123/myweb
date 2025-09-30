<template>
  <div class="stats" v-if="stats">
    <div class="stat-item">
      <label>日志条目:</label>
      <span>{{ stats.entries ?? 0 }}</span>
    </div>
    <div class="stat-item">
      <label>文件大小:</label>
      <span>{{ stats.sizeFormatted || formatSize(stats.size) }}</span>
    </div>
    <div class="stat-item">
      <label>最后修改:</label>
      <span>{{ displayLastModified }}</span>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import { formatDateTime } from '@/utils/datetime.js';

  const props = defineProps({
    stats: {
      type: Object,
      default: null,
    },
  });

  const displayLastModified = computed(() => {
    if (!props.stats?.lastModified) return '';
    return formatDateTime(props.stats.lastModified);
  });

  function formatSize(size) {
    if (!size) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let value = size;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }
</script>

<style scoped>
  .stats {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    padding: 15px;
    background: #f9f9f9;
    border-radius: 6px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-item label {
    font-weight: bold;
    margin-bottom: 5px;
  }
</style>
