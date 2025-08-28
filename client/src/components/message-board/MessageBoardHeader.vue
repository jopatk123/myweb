<template>
  <div class="message-board-header">
    <div class="header-left">
      <h3>💬 留言板</h3>
      <span class="online-status" :class="{ connected: isConnected }">
        {{ isConnected ? '已连接' : '连接中...' }}
      </span>
    </div>
    <div class="header-right">
      <button
        @click="$emit('toggle-settings')"
        class="settings-btn"
        title="设置"
      >
        ⚙️
      </button>
      <button @click="$emit('close')" class="close-btn" title="关闭">✕</button>
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    isConnected: { type: Boolean, required: true },
  });
</script>

<style scoped>
  .message-board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-left h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }

  .online-status {
    font-size: 12px;
    color: #6c757d;
    padding: 2px 8px;
    border-radius: 12px;
    background: #e9ecef;
  }

  .online-status.connected {
    color: #28a745;
    background: #d4edda;
  }

  .header-right {
    display: flex;
    gap: 8px;
  }

  .settings-btn,
  .close-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .settings-btn:hover,
  .close-btn:hover {
    background: #e9ecef;
  }
</style>
