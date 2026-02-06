<template>
  <div class="message-board-header">
    <div class="header-top">
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
    <div class="header-search">
      <div class="search-input">
        <input
          :value="searchQuery"
          type="text"
          placeholder="搜索留言内容或作者"
          @input="$emit('update:search-query', $event.target.value)"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          title="清除搜索"
          @click="$emit('update:search-query', '')"
        >
          ✕
        </button>
      </div>
      <span v-if="isSearching" class="search-meta">
        {{ loading ? '搜索中...' : `共 ${searchCount} 条` }}
      </span>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    isConnected: { type: Boolean, required: true },
    searchQuery: { type: String, default: '' },
    searchCount: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    isSearching: { type: Boolean, default: false },
  });

  defineEmits(['toggle-settings', 'close', 'update:search-query']);
</script>

<style scoped>
  .message-board-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 20px 12px;
    background: #fff;
    border-bottom: 1px solid #e9ecef;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-left h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #343a40;
  }

  .online-status {
    font-size: 12px;
    font-weight: 500;
    color: #868e96;
    padding: 2px 10px;
    border-radius: 12px;
    background: #f1f3f5;
  }

  .online-status.connected {
    color: #2b8a3e;
    background: #ebfbee;
  }

  .header-right {
    display: flex;
    gap: 8px;
  }

  .settings-btn,
  .close-btn {
    background: transparent;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 6px;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #495057;
  }

  .settings-btn:hover,
  .close-btn:hover {
    background: #f1f3f5;
    color: #212529;
  }
  
  .close-btn:hover {
    background: #ffe3e3;
    color: #fa5252;
  }

  .header-search {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .search-input {
    position: relative;
    flex: 1;
  }

  .search-input input {
    width: 100%;
    padding: 8px 28px 8px 12px;
    border: 1px solid #e9ecef;
    border-radius: 10px;
    font-size: 13px;
    background: #f8f9fa;
    transition: all 0.2s;
  }

  .search-input input:focus {
    outline: none;
    border-color: #4dabf7;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(77, 171, 247, 0.2);
  }

  .search-input .clear-btn {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: #868e96;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-input .clear-btn:hover {
    color: #495057;
  }

  .search-meta {
    font-size: 12px;
    color: #868e96;
    white-space: nowrap;
  }
</style>
