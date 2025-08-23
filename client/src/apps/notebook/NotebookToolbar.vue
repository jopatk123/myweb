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
  });

  const emit = defineEmits([
    'update:search',
    'update:filter',
    'update:category',
    'addNote',
  ]);

  // 本地响应式数据
  const searchValue = ref(props.search);
  const filterValue = ref(props.filter);
  const categoryValue = ref(props.category);

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
</script>

<style scoped>
  .notebook-toolbar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
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
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 14px;
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
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 13px;
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
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
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
