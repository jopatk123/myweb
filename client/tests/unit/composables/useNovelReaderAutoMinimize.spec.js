import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';

const minimizeWindow = vi.fn();

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: () => ({
    minimizeWindow,
  }),
}));

import { useNovelReaderAutoMinimize } from '@/composables/useNovelReaderAutoMinimize.js';

function createWindow(overrides = {}) {
  return ref({
    id: 42,
    appSlug: 'novel-reader',
    minimized: false,
    ...overrides,
  });
}

describe('useNovelReaderAutoMinimize', () => {
  beforeEach(() => {
    minimizeWindow.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules minimize when leaving active novel reader window', () => {
    localStorage.setItem(
      'novel-reader-settings',
      JSON.stringify({
        autoMinimize: true,
      })
    );
    const windowRef = createWindow();
    const isActiveRef = ref(true);

    const handlers = useNovelReaderAutoMinimize(windowRef, isActiveRef);

    vi.useFakeTimers();
    handlers.onMouseLeave();

    expect(minimizeWindow).not.toHaveBeenCalled();
    vi.advanceTimersByTime(120);
    expect(minimizeWindow).toHaveBeenCalledWith(42);
  });

  it('does not minimize when autoMinimize is disabled', () => {
    localStorage.setItem(
      'novel-reader-settings',
      JSON.stringify({
        autoMinimize: false,
      })
    );
    const windowRef = createWindow();
    const isActiveRef = ref(true);

    const handlers = useNovelReaderAutoMinimize(windowRef, isActiveRef);

    vi.useFakeTimers();
    handlers.onMouseLeave();
    vi.advanceTimersByTime(200);

    expect(minimizeWindow).not.toHaveBeenCalled();
  });

  it('cancels scheduled minimize on mouse enter', () => {
    localStorage.setItem(
      'novel-reader-settings',
      JSON.stringify({
        autoMinimize: true,
      })
    );
    const windowRef = createWindow();
    const isActiveRef = ref(true);

    const handlers = useNovelReaderAutoMinimize(windowRef, isActiveRef);

    vi.useFakeTimers();
    handlers.onMouseLeave();
    handlers.onMouseEnter();
    vi.advanceTimersByTime(200);

    expect(minimizeWindow).not.toHaveBeenCalled();
  });
});
