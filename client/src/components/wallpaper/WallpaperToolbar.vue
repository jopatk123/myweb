<template>
  <div class="toolbar">
    <input
      :value="keyword"
      @input="$emit('update:keyword', $event.target.value)"
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
  defineProps({
    keyword: {
      type: String,
      required: true,
    },
  });

  defineEmits(['update:keyword']);
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
