<template>
  <div class="filters">
    <input
      :value="searchQuery"
      @input="onSearchInput"
      placeholder="搜索日志内容..."
      class="search-input"
    />
    <select :value="selectedLines" @change="onLinesChange">
      <option value="50">显示 50 条</option>
      <option value="100">显示 100 条</option>
      <option value="200">显示 200 条</option>
      <option value="500">显示 500 条</option>
    </select>
  </div>
</template>

<script setup>
  defineProps({
    searchQuery: {
      type: String,
      default: '',
    },
    selectedLines: {
      type: [String, Number],
      default: '100',
    },
  });

  const emit = defineEmits(['update:search-query', 'update:selected-lines']);

  function onSearchInput(event) {
    emit('update:search-query', event.target.value);
  }

  function onLinesChange(event) {
    emit('update:selected-lines', event.target.value);
  }
</script>

<style scoped>
  .filters {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
    align-items: center;
  }

  .search-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .filters select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
  }

  @media (max-width: 768px) {
    .filters {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
