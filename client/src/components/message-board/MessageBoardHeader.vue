<template>
  <div class="message-board-header">
    <div class="search-input">
      <input
        :value="searchQuery"
        type="search"
        placeholder="搜索留言或作者"
        aria-label="搜索留言或作者"
        @input="$emit('update:search-query', $event.target.value)"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="clear-btn"
        title="清除搜索"
        aria-label="清除搜索"
        @click="$emit('update:search-query', '')"
      >
        ✕
      </button>
    </div>
    <span v-if="isSearching" class="search-meta">
      {{ loading ? '搜索中...' : `${searchCount} 条` }}
    </span>
    <span class="online-status" :class="statusClass" :title="statusText">
      {{ statusText }}
    </span>
    <button
      type="button"
      class="settings-btn"
      title="设置"
      aria-label="打开设置"
      @click="$emit('toggle-settings')"
    >
      ⚙️
    </button>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    isConnected: { type: Boolean, required: true },
    reconnectAttempts: { type: Number, default: 0 },
    maxReconnectAttempts: { type: Number, default: 5 },
    searchQuery: { type: String, default: '' },
    searchCount: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    isSearching: { type: Boolean, default: false },
  });

  defineEmits(['toggle-settings', 'update:search-query']);

  const statusText = computed(() => {
    if (props.isConnected) return '已连接';
    if (
      props.reconnectAttempts > 0 &&
      props.reconnectAttempts < props.maxReconnectAttempts
    ) {
      return `重连 ${props.reconnectAttempts}/${props.maxReconnectAttempts}`;
    }
    return '未连接';
  });

  const statusClass = computed(() => ({
    connected: props.isConnected,
    reconnecting:
      !props.isConnected &&
      props.reconnectAttempts > 0 &&
      props.reconnectAttempts < props.maxReconnectAttempts,
    disconnected: !props.isConnected,
  }));
</script>

<style scoped>
  .message-board-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #fff;
    border-bottom: 1px solid #e9ecef;
    flex-shrink: 0;
  }

  .search-input {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .search-input input {
    width: 100%;
    height: 28px;
    padding: 0 24px 0 8px;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    font-size: 12px;
    background: #f8f9fa;
    transition:
      border-color 0.15s,
      background-color 0.15s,
      box-shadow 0.15s;
  }

  .search-input input:focus {
    outline: none;
    border-color: #4dabf7;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(77, 171, 247, 0.18);
  }

  .search-input .clear-btn {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: #868e96;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    padding: 0;
  }

  .search-input .clear-btn:hover {
    color: #495057;
  }

  .search-meta {
    font-size: 11px;
    color: #868e96;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .online-status {
    font-size: 11px;
    font-weight: 500;
    color: #868e96;
    padding: 1px 7px;
    border-radius: 10px;
    background: #f1f3f5;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .online-status.connected {
    color: #2b8a3e;
    background: #ebfbee;
  }

  .online-status.reconnecting {
    color: #e67700;
    background: #fff9db;
  }

  .online-status.disconnected {
    color: #c92a2a;
    background: #fff5f5;
  }

  .settings-btn {
    background: transparent;
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #495057;
    flex-shrink: 0;
  }

  .settings-btn:hover {
    background: #f1f3f5;
    color: #212529;
  }
</style>
