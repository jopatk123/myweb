<template>
  <div class="page-header">
    <h1>壁纸管理</h1>
    <div class="action-buttons">
      <button @click="$emit('open-main-window')" class="btn btn-info">主窗口</button>
      <button @click="$emit('upload-wallpaper')" class="btn btn-primary">上传壁纸</button>
      <button @click="$emit('random-wallpaper')" class="btn btn-accent">随机切换</button>
      <button class="btn btn-secondary" disabled>更多…</button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['open-main-window', 'upload-wallpaper', 'random-wallpaper']);
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
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}
.btn-primary { background: #007bff; color: white; }
.btn-primary:hover { background: #0056b3; }
.btn-secondary { background: #6c757d; color: white; }
.btn-secondary:hover { background: #545b62; }
.btn-accent { background: #28a745; color: white; }
.btn-accent:hover { background: #1e7e34; }
.btn-info { background: #17a2b8; color: white; }
.btn-info:hover { background: #138496; }
</style>
