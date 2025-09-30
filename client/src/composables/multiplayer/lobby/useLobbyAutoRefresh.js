import { ref, watch, toRefs, onMounted, onScopeDispose } from 'vue';

export function useLobbyAutoRefresh(props, refreshRooms) {
  const { autoRefresh, refreshInterval, isConnected, loading } = toRefs(props);

  const refreshTimer = ref(null);

  const clearTimer = () => {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value);
      refreshTimer.value = null;
    }
  };

  const startAutoRefresh = () => {
    clearTimer();
    if (!autoRefresh.value || refreshInterval.value <= 0) {
      return;
    }

    refreshTimer.value = setInterval(() => {
      if (isConnected.value && !loading.value) {
        refreshRooms();
      }
    }, refreshInterval.value);
  };

  const stopAutoRefresh = () => {
    clearTimer();
  };

  const refreshWhenReady = () => {
    if (isConnected.value && !loading.value) {
      refreshRooms();
    }
  };

  watch([autoRefresh, refreshInterval], () => {
    if (autoRefresh.value && refreshInterval.value > 0) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  watch(isConnected, connected => {
    if (connected) {
      refreshRooms();
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  watch(loading, (value, prevValue) => {
    if (prevValue && !value) {
      refreshWhenReady();
      startAutoRefresh();
    }
  });

  onMounted(() => {
    refreshRooms();
    startAutoRefresh();
  });

  onScopeDispose(() => {
    stopAutoRefresh();
  });

  return {
    refreshTimer,
    startAutoRefresh,
    stopAutoRefresh,
  };
}
