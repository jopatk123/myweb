import { ref } from 'vue';
import { logsApi } from '@/api/logs.js';

const defaultConfirm = message => {
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm(message);
  }
  return true;
};

const defaultNotify = message => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
  }
};

export function useAILogs({
  defaultLines = 100,
  confirmAction = defaultConfirm,
  notify = defaultNotify,
} = {}) {
  const logs = ref([]);
  const stats = ref(null);
  const loading = ref(false);
  const disabled = ref(false);
  const searchQuery = ref('');
  const selectedLines = ref(defaultLines);
  const lastError = ref(null);

  const buildParams = () => ({
    format: 'json',
    lines: selectedLines.value,
    search: searchQuery.value.trim(),
  });

  const handleDisabledState = data => {
    if (data?.disabled) {
      disabled.value = true;
      logs.value = [];
      return true;
    }

    disabled.value = false;
    return false;
  };

  const loadStats = async () => {
    try {
      const result = await logsApi.getAILogStats();
      stats.value = result?.data ?? null;
      if (handleDisabledState(result?.data)) {
        return stats.value;
      }
      return stats.value;
    } catch (error) {
      lastError.value = error;
      stats.value = null;
      return null;
    }
  };

  const loadLogs = async () => {
    loading.value = true;
    lastError.value = null;

    try {
      const result = await logsApi.getAILogs(buildParams());
      const data = result?.data ?? {};
      if (!handleDisabledState(data)) {
        logs.value = Array.isArray(data.logs) ? data.logs : [];
      }
      await loadStats();
      return logs.value;
    } catch (error) {
      logs.value = [];
      lastError.value = error;
      await loadStats();
      return [];
    } finally {
      loading.value = false;
    }
  };

  const refresh = () => loadLogs();

  const clearLogs = async () => {
    if (!confirmAction('确定要清空所有AI对话日志吗？此操作不可恢复。')) {
      return false;
    }

    loading.value = true;
    try {
      await logsApi.clearAILogs();
      logs.value = [];
      stats.value = null;
      notify('日志已清空');
      await loadStats();
      return true;
    } catch (error) {
      lastError.value = error;
      notify('清空日志失败');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const updateSearchQuery = value => {
    searchQuery.value = value;
  };

  const updateSelectedLines = value => {
    selectedLines.value = Number(value) || defaultLines;
  };

  return {
    logs,
    stats,
    loading,
    disabled,
    searchQuery,
    selectedLines,
    lastError,
    loadLogs,
    loadStats,
    refresh,
    clearLogs,
    updateSearchQuery,
    updateSelectedLines,
  };
}
