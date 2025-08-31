<template>
  <div class="ai-logs-viewer">
    <div class="header">
      <h2>AI对话日志查看器</h2>
      <div class="controls">
        <button @click="refreshLogs" :disabled="loading">
          <span v-if="loading">刷新中...</span>
          <span v-else>刷新</span>
        </button>
        <button @click="clearLogs" :disabled="loading" class="danger">
          清空日志
        </button>
      </div>
    </div>

    <div class="stats" v-if="stats">
      <div class="stat-item">
        <label>日志条目:</label>
        <span>{{ stats.entries }}</span>
      </div>
      <div class="stat-item">
        <label>文件大小:</label>
        <span>{{ stats.sizeFormatted }}</span>
      </div>
      <div class="stat-item">
        <label>最后修改:</label>
        <span>{{ formatDate(stats.lastModified) }}</span>
      </div>
    </div>

    <div class="filters">
      <input
        v-model="searchQuery"
        @input="debouncedSearch"
        placeholder="搜索日志内容..."
        class="search-input"
      />
      <select v-model="selectedLines" @change="refreshLogs">
        <option value="50">显示 50 条</option>
        <option value="100">显示 100 条</option>
        <option value="200">显示 200 条</option>
        <option value="500">显示 500 条</option>
      </select>
    </div>

    <div class="logs-container">
      <div v-if="loading" class="loading">
        正在加载日志...
      </div>
      <div v-else-if="logs.length === 0" class="empty">
        暂无日志记录
      </div>
      <div v-else class="logs-list">
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="log-entry"
          :class="`player-${log.playerType}`"
        >
          <div class="log-header">
            <span class="timestamp">{{ formatDate(log.timestamp) }}</span>
            <span class="model">{{ log.model }}</span>
            <span class="player">玩家 {{ log.playerType }}</span>
          </div>
          <div class="log-content">
            <div class="request">
              <h4>请求:</h4>
              <pre>{{ log.requestText }}</pre>
            </div>
            <div class="response">
              <h4>响应:</h4>
              <pre>{{ log.responseText }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { logsApi } from '../../api/logs.js';

export default {
  name: 'AILogsViewer',
  setup() {
    const logs = ref([]);
    const stats = ref(null);
    const loading = ref(false);
    const searchQuery = ref('');
    const selectedLines = ref(100);

    const loadStats = async () => {
      try {
        const result = await logsApi.getAILogStats();
        stats.value = result.data;
      } catch (error) {
        console.error('获取日志统计失败:', error);
      }
    };

    const loadLogs = async () => {
      loading.value = true;
      try {
        const params = {
          format: 'json',
          lines: selectedLines.value,
          search: searchQuery.value.trim()
        };
        
        const result = await logsApi.getAILogs(params);
        logs.value = result.data.logs || [];
        
        // 同时更新统计信息
        await loadStats();
      } catch (error) {
        console.error('获取日志失败:', error);
        logs.value = [];
      } finally {
        loading.value = false;
      }
    };

    const refreshLogs = () => {
      loadLogs();
    };

    const clearLogs = async () => {
      if (!confirm('确定要清空所有AI对话日志吗？此操作不可恢复。')) {
        return;
      }
      
      loading.value = true;
      try {
        await logsApi.clearAILogs();
        logs.value = [];
        stats.value = null;
        alert('日志已清空');
      } catch (error) {
        console.error('清空日志失败:', error);
        alert('清空日志失败');
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString('zh-CN');
    };

    // 防抖搜索
    let searchTimeout = null;
    const debouncedSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadLogs();
      }, 500);
    };

    onMounted(() => {
      loadLogs();
    });

    return {
      logs,
      stats,
      loading,
      searchQuery,
      selectedLines,
      refreshLogs,
      clearLogs,
      formatDate,
      debouncedSearch
    };
  }
};
</script>

<style scoped>
.ai-logs-viewer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.controls {
  display: flex;
  gap: 10px;
}

.controls button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  cursor: pointer;
  border-radius: 4px;
}

.controls button:hover {
  background: #e0e0e0;
}

.controls button.danger {
  background: #ff4444;
  color: white;
  border-color: #cc0000;
}

.controls button.danger:hover {
  background: #cc0000;
}

.controls button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item label {
  font-weight: bold;
  margin-bottom: 5px;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filters select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.logs-container {
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.loading,
.empty {
  text-align: center;
  padding: 40px;
  color: #666;
}

.logs-list {
  padding: 0;
}

.log-entry {
  border-bottom: 1px solid #eee;
  padding: 15px;
  margin: 0;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.player-1 {
  border-left: 4px solid #333;
  background: #fafafa;
}

.log-entry.player-2 {
  border-left: 4px solid #666;
  background: #f5f5f5;
}

.log-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  color: #666;
}

.timestamp {
  font-weight: bold;
}

.model {
  color: #007acc;
}

.player {
  color: #cc6600;
}

.log-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.request,
.response {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.request h4,
.response h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #333;
}

.request h4 {
  color: #006600;
}

.response h4 {
  color: #0066cc;
}

.request pre,
.response pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 12px;
  line-height: 1.4;
  max-height: 200px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .log-content {
    grid-template-columns: 1fr;
  }
  
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stats {
    flex-direction: column;
  }
}
</style>
