<template>
  <div class="ai-logs-viewer">
    <div class="header">
      <h2>AI对话日志查看器（已禁用文件存储）</h2>
      <LogsViewerToolbar
        v-if="!disabled"
        :loading="loading"
        @refresh="handleRefresh"
        @clear="handleClear"
      />
    </div>

    <DisabledHint v-if="disabled" />

    <template v-else>
      <LogsStats v-if="stats" :stats="stats" />
      <LogsFilters
        :search-query="localSearch"
        :selected-lines="String(selectedLines)"
        @update:search-query="handleSearch"
        @update:selected-lines="handleLinesChange"
      />
    </template>

    <LogsList
      ref="logsListRef"
      :logs="logs"
      :loading="loading"
      :empty-message="disabled ? '文件日志功能已禁用' : '暂无日志记录'"
    />
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
  import LogsViewerToolbar from './ai-logs/LogsViewerToolbar.vue';
  import LogsStats from './ai-logs/LogsStats.vue';
  import LogsFilters from './ai-logs/LogsFilters.vue';
  import LogsList from './ai-logs/LogsList.vue';
  import DisabledHint from './ai-logs/DisabledHint.vue';
  import { useAILogs } from '@/composables/useAILogs.js';
  import { useConfirm } from '@/composables/useConfirm.js';

  const { confirmAction, notify } = useConfirm();

  const {
    logs,
    stats,
    loading,
    disabled,
    searchQuery,
    selectedLines,
    refresh,
    clearLogs,
    updateSearchQuery,
    updateSelectedLines,
  } = useAILogs({
    confirmAction,
    notify,
  });

  const logsListRef = ref(null);
  const localSearch = ref(searchQuery.value);
  let searchTimer = null;

  const scrollToTop = () => {
    logsListRef.value?.scrollToTop?.();
  };

  const triggerRefresh = async () => {
    await refresh();
    scrollToTop();
  };

  const handleRefresh = () => {
    triggerRefresh();
  };

  const handleClear = async () => {
    const cleared = await clearLogs();
    if (cleared) {
      updateSearchQuery('');
      localSearch.value = '';
      scrollToTop();
    }
  };

  const handleSearch = value => {
    localSearch.value = value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      updateSearchQuery(value);
      triggerRefresh();
    }, 500);
  };

  const handleLinesChange = value => {
    updateSelectedLines(value);
    triggerRefresh();
  };

  watch(searchQuery, value => {
    if (value !== localSearch.value) {
      localSearch.value = value;
    }
  });

  onMounted(async () => {
    await triggerRefresh();
  });

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer);
  });
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
</style>
