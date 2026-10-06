<template>
  <div class="notebook-toolbar">
    <div class="toolbar-row">
      <div class="search-group">
        <input
          v-model="searchValue"
          type="text"
          placeholder="搜索笔记..."
          class="search-input"
          aria-label="搜索笔记"
          @input="updateSearch"
        />
      </div>

      <select
        v-model="categoryValue"
        aria-label="按分类筛选"
        class="filter-select"
        @change="updateCategory"
      >
        <option value="all">全部分类</option>
        <option
          v-for="category in categories"
          :key="category"
          :value="category"
        >
          {{ category }}
        </option>
      </select>

      <select
        v-model="filterValue"
        aria-label="按状态筛选"
        class="filter-select"
        @change="updateFilter"
      >
        <option value="all">全部状态</option>
        <option value="pending">待办</option>
        <option value="completed">已完成</option>
      </select>

      <select
        v-model="priorityValue"
        aria-label="按优先级筛选"
        class="filter-select"
        @change="updatePriority"
      >
        <option value="all">全部优先级</option>
        <option value="high">高优先级</option>
        <option value="medium">中优先级</option>
        <option value="low">低优先级</option>
      </select>

      <select
        v-model="sortByValue"
        aria-label="排序方式"
        class="filter-select"
        @change="updateSortBy"
      >
        <option value="updated">最近更新</option>
        <option value="priority">按优先级</option>
        <option value="title">按标题</option>
      </select>

      <button
        class="btn btn-icon"
        @click="toggleCompactView"
        :title="compactView ? '切换到普通视图' : '切换到紧凑视图'"
        :aria-label="compactView ? '切换到普通视图' : '切换到紧凑视图'"
      >
        <NotebookIcon :name="compactView ? 'detailed' : 'compact'" :size="16" />
      </button>

      <button
        class="btn btn-clear-completed"
        :disabled="completedCount === 0"
        title="删除所有已完成的笔记"
        @click="$emit('clearCompleted')"
      >
        <NotebookIcon name="clearDone" :size="15" />
        清除已完成
      </button>

      <button class="btn btn-primary" @click="$emit('addNote')">
        <NotebookIcon name="plus" :size="15" />
        新建
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import NotebookIcon from './NotebookIcon.vue';

  const props = defineProps({
    search: {
      type: String,
      default: '',
    },
    filter: {
      type: String,
      default: 'all',
    },
    category: {
      type: String,
      default: 'all',
    },
    filterPriority: {
      type: String,
      default: 'all',
    },
    sortBy: {
      type: String,
      default: 'updated',
    },
    categories: {
      type: Array,
      default: () => [],
    },
    compactView: {
      type: Boolean,
      default: false,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
  });

  const emit = defineEmits([
    'update:search',
    'update:filter',
    'update:category',
    'update:filterPriority',
    'update:sortBy',
    'update:compactView',
    'addNote',
    'clearCompleted',
  ]);

  const searchValue = ref(props.search);
  const filterValue = ref(props.filter);
  const categoryValue = ref(props.category);
  const priorityValue = ref(props.filterPriority);
  const sortByValue = ref(props.sortBy);
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
    () => props.category,
    newVal => {
      categoryValue.value = newVal;
    }
  );
  watch(
    () => props.filterPriority,
    newVal => {
      priorityValue.value = newVal;
    }
  );
  watch(
    () => props.sortBy,
    newVal => {
      sortByValue.value = newVal;
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

  function updateCategory() {
    emit('update:category', categoryValue.value);
  }

  function updatePriority() {
    emit('update:filterPriority', priorityValue.value);
  }

  function updateSortBy() {
    emit('update:sortBy', sortByValue.value);
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
    gap: 8px;
    flex-wrap: wrap;
  }

  .search-group {
    flex: 1;
    min-width: 160px;
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

  .filter-select {
    padding: 8px 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 13px;
    cursor: pointer;
    appearance: none;
    min-width: 88px;
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
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }

  .btn-icon {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px 10px;
  }

  .btn-icon:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .btn-clear-completed {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-clear-completed:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.35);
    border-color: rgba(239, 68, 68, 0.45);
  }

  @media (max-width: 768px) {
    .search-input,
    .filter-select {
      font-size: 16px;
    }
  }

  @media (max-width: 600px) {
    .toolbar-row {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-select {
      width: 100%;
    }

    .btn {
      justify-content: center;
    }
  }
</style>
