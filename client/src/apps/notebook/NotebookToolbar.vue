<template>
  <div class="notebook-toolbar">
    <div class="toolbar-row">
      <div class="search-group">
        <input
          v-model="searchValue"
          type="text"
          placeholder="搜索笔记..."
          class="search-input"
          @input="updateSearch"
        />
      </div>

      <div class="filter-group">
        <select
          v-model="filterValue"
          @change="updateFilter"
          class="filter-select"
        >
          <option value="all">全部状态</option>
          <option value="pending">待办</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      <button
        class="btn btn-view-toggle"
        @click="toggleCompactView"
        :title="compactView ? '切换到普通视图' : '切换到紧凑视图'"
      >
        {{ compactView ? '📋' : '📝' }}
      </button>

      <button class="btn btn-primary" @click="$emit('addNote')">
        <span class="icon">➕</span> 新建
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';

  const props = defineProps({
    search: {
      type: String,
      default: '',
    },
    filter: {
      type: String,
      default: 'all',
    },
    compactView: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits([
    'update:search',
    'update:filter',
    'update:compactView',
    'addNote',
  ]);

  const searchValue = ref(props.search);
  const filterValue = ref(props.filter);
  const compactView = ref(props.compactView);

  watch(
    () => props.search,
    newVal => {
      searchValue.value = newVal;
    }
  );
  watch(
    () => props.filter,
    newVal => {
      filterValue.value = newVal;
    }
  );
  watch(
    () => props.compactView,
    newVal => {
      compactView.value = newVal;
    }
  );

  function updateSearch() {
    emit('update:search', searchValue.value);
  }

  function updateFilter() {
    emit('update:filter', filterValue.value);
  }

  function toggleCompactView() {
    compactView.value = !compactView.value;
    emit('update:compactView', compactView.value);
  }
</script>

<style scoped>
  .notebook-toolbar {
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .search-group {
    flex: 1;
    min-width: 200px;
  }

  .search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 14px;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }

  .search-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }

  .filter-group {
    display: flex;
    align-items: center;
  }

  .filter-select {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 14px;
    cursor: pointer;
    appearance: none;
    min-width: 100px;
  }

  .filter-select:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }

  .filter-select option {
    background: #2a2a2a;
    color: white;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-primary {
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }

  .btn-view-toggle {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px 12px;
  }

  .btn-view-toggle:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  @media (max-width: 600px) {
    .toolbar-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
