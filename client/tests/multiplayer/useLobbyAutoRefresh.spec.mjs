import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { useLobbyAutoRefresh } from '@/composables/multiplayer/lobby/useLobbyAutoRefresh.js';

describe('useLobbyAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const withSetup = (callback) => {
    let result;
    const Comp = {
      setup() {
        result = callback();
        return () => null;
      },
    };
    mount(Comp);
    return result;
  };

  const createComposable = (overrides = {}) => {
    const props = reactive({
      autoRefresh: true,
      refreshInterval: 5000,
      isConnected: true,
      loading: false,
      ...overrides
    });
    const refresh = vi.fn();
    const api = withSetup(() => useLobbyAutoRefresh(props, refresh));
    return { props, refresh, api };
  };

  it('triggers refresh on interval when connected', () => {
    const { refresh } = createComposable();
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('stops refreshing when disconnected', () => {
    const { props, refresh } = createComposable();
    expect(refresh).toHaveBeenCalledTimes(1);
    props.isConnected = false;
    vi.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('restarts after loading finishes', () => {
    const { props, refresh } = createComposable({ loading: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(1);
    props.loading = false;
    vi.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
