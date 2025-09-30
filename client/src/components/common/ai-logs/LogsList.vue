<template>
  <div class="logs-container" ref="containerRef">
    <div v-if="loading" class="loading">正在加载日志...</div>
    <div v-else-if="logs.length === 0" class="empty">
      {{ emptyMessage }}
    </div>
    <div v-else class="logs-list">
      <LogEntry v-for="(log, index) in logs" :key="index" :log="log" />
    </div>
  </div>
</template>

<script setup>
  import { ref, onBeforeUnmount } from 'vue';
  import LogEntry from './LogEntry.vue';

  defineProps({
    logs: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    emptyMessage: {
      type: String,
      default: '暂无日志记录',
    },
  });

  const containerRef = ref(null);

  function scrollToTop() {
    if (containerRef.value) containerRef.value.scrollTop = 0;
  }

  defineExpose({
    scrollToTop,
    containerRef,
  });

  onBeforeUnmount(() => {
    if (containerRef.value) containerRef.value = null;
  });
</script>

<style scoped>
  .logs-container {
    max-height: 600px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 6px;
  }

  .loading,
  .empty {
    text-align: center;
    padding: 40px;
    color: #666;
  }

  .logs-list {
    padding: 0;
  }
</style>
