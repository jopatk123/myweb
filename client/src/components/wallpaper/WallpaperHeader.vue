<template>
  <div class="page-header">
    <h1>壁纸管理</h1>
    <div class="action-buttons">
      <button
        @click="$emit('bulk-delete')"
        class="btn btn-danger"
        :disabled="selectedCount === 0"
      >
        删除 ({{ selectedCount }})
      </button>
      <button
        @click="$emit('bulk-move')"
        class="btn btn-secondary"
        :disabled="selectedCount === 0"
      >
        移动 ({{ selectedCount }})
      </button>
      <div class="upload-group">
        <button
          @click="$emit('open-bulk-upload')"
          class="btn btn-primary small"
        >
          上传壁纸
        </button>
      </div>
      <button @click="$emit('open-main-window')" class="btn btn-info">
        打开桌面
      </button>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    selectedCount: {
      type: Number,
      default: 0,
    },
  });

  defineEmits([
    'open-main-window',
    'upload-wallpaper',
    'open-bulk-upload',
    'bulk-delete',
    'bulk-move',
  ]);
</script>

<style scoped>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .page-header h1 {
    margin: 0;
    color: #111827;
    font-size: 20px;
  }
  .action-buttons {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .upload-group {
    display: flex;
    gap: 6px;
  }
  .upload-group .small {
    padding: 6px 10px;
    font-size: 13px;
  }
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-primary {
    background: #007bff;
    color: white;
  }
  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #545b62;
  }
  .btn-accent {
    background: #28a745;
    color: white;
  }
  .btn-accent:hover:not(:disabled) {
    background: #1e7e34;
  }
  .btn-danger {
    background: #dc3545;
    color: white;
  }
  .btn-danger:hover:not(:disabled) {
    background: #c82333;
  }
  .btn-info {
    background: #17a2b8;
    color: white;
  }
  .btn-info:hover:not(:disabled) {
    background: #138496;
  }
</style>
