<template>
  <div class="connection-status">
    <div class="loading-spinner"></div>
    <span>连接服务器中...</span>
  </div>
</template>

<style scoped>
.connection-status {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
