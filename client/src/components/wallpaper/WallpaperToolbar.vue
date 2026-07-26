<template>
  <div class="toolbar">
    <input
      :value="keyword"
      @input="onInput"
      class="search-input"
      placeholder="搜索：名称/备注/关键字…"
    />
    <div class="toolbar-actions">
      <button class="btn btn-secondary btn-sm" disabled>批量操作</button>
      <button class="btn btn-secondary btn-sm" disabled>导入</button>
      <button class="btn btn-secondary btn-sm" disabled>导出</button>
    </div>
  </div>
</template>

<script setup>
  import { onScopeDispose } from 'vue';

  defineProps({
    keyword: {
      type: String,
      required: true,
    },
  });

  const emit = defineEmits(['update:keyword']);

  // 搜索防抖：避免快速输入时频繁触发父组件 computed 重算
  const DEBOUNCE_MS = 200;
  let debounceTimer = null;

  const onInput = event => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      emit('update:keyword', event.target.value);
    }, DEBOUNCE_MS);
  };

  onScopeDispose(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  });
</script>

<style scoped>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .search-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fff;
  }
  .toolbar-actions {
    display: flex;
    gap: 8px;
  }
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
  }
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  .btn-secondary:hover {
    background: #545b62;
  }
  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }
</style>
