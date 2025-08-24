<template>
  <div class="notebook-toolbar">
    <div class="toolbar-row">
      <!-- 搜索框 -->
      <div class="search-group">
        <input
          v-model="searchValue"
          type="text"
          placeholder="搜索笔记..."
          class="search-input"
          @input="updateSearch"
        />
      </div>

      <!-- 视图切换 -->
      <button
        class="btn btn-view-toggle"
        @click="toggleCompactView"
        :title="compactView ? '切换到普通视图' : '切换到紧凑视图'"
      >
        {{ compactView ? '📋' : '📝' }}
      </button>

      <!-- 新建按钮 -->
      <button class="btn btn-primary" @click="$emit('addNote')">➕ 新建</button>
    </div>

    <div class="toolbar-row">
      <!-- 状态筛选 -->
      <div class="filter-group">
        <label class="filter-label">状态:</label>
        <select
          v-model="filterValue"
          @change="updateFilter"
          class="filter-select"
        >
          <option value="all">全部</option>
          <option value="pending">待办</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      <!-- 分类筛选 -->
      <div class="filter-group">
        <label class="filter-label">分类:</label>
        <select
          v-model="categoryValue"
          @change="updateCategory"
          class="filter-select"
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
      </div>
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
    category: {
      type: String,
      default: 'all',
    },
    categories: {
      type: Array,
      default: () => [],
    },
    compactView: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits([
    'update:search',
    'update:filter',
    'update:category',
    'update:compactView',
    'addNote',
  ]);

  // 本地响应式数据
  const searchValue = ref(props.search);
  const filterValue = ref(props.filter);
  const categoryValue = ref(props.category);
  const compactView = ref(props.compactView);

  // 监听props变化
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
    () => props.compactView,
    newVal => {
      compactView.value = newVal;
    }
  );

  // 更新方法
  function updateSearch() {
    emit('update:search', searchValue.value);
  }

  function updateFilter() {
    emit('update:filter', filterValue.value);
  }

  function updateCategory() {
    emit('update:category', categoryValue.value);
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
    gap: 8px;
    margin-bottom: 10px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
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
    min-width: 200px;
  }

  .search-input {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 13px;
    backdrop-filter: blur(10px);
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .search-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.15);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    white-space: nowrap;
  }

  .filter-select {
    padding: 5px 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 12px;
    backdrop-filter: blur(10px);
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }

  .filter-select option {
    background: #333;
    color: white;
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 13px;
    white-space: nowrap;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-primary {
    background: linear-gradient(45deg, #4ade80, #22c55e);
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(45deg, #22c55e, #16a34a);
  }

  .btn-view-toggle {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-view-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 768px) {
    .toolbar-row {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .search-group {
      min-width: auto;
    }

    .filter-group {
      justify-content: space-between;
    }

    .btn {
      align-self: center;
      min-width: 120px;
    }
  }
</style>
