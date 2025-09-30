<template>
  <div class="controls">
    <button @click="$emit('refresh')" :disabled="loading">
      <span v-if="loading">刷新中...</span>
      <span v-else>刷新</span>
    </button>
    <button @click="$emit('clear')" :disabled="loading" class="danger">
      清空日志
    </button>
  </div>
</template>

<script setup>
  defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
  });
</script>

<style scoped>
  .controls {
    display: flex;
    gap: 10px;
  }

  .controls button {
    padding: 8px 16px;
    border: 1px solid #ddd;
    background: #f5f5f5;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .controls button:hover {
    background: #e0e0e0;
  }

  .controls button.danger {
    background: #ff4444;
    color: white;
    border-color: #cc0000;
  }

  .controls button.danger:hover {
    background: #cc0000;
  }

  .controls button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
