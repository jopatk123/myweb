import { defineComponent, h, nextTick } from 'vue';
import { render } from '@testing-library/vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const websocketMocks = vi.hoisted(() => ({
  onMessage: vi.fn(),
  offMessage: vi.fn(),
}));

vi.mock('@/composables/useWebSocket.js', () => ({
  useWebSocket: () => websocketMocks,
}));

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: () => ({
    createWindow: vi.fn(),
    findWindowByAppAll: vi.fn(() => null),
    setActiveWindow: vi.fn(),
    showWindowWithoutFocus: vi.fn(),
  }),
}));

vi.mock('@/apps/registry.js', () => ({
  getAppComponentBySlug: () => null,
}));

import { useMessageBoardAutoOpen } from '@/composables/useMessageBoardAutoOpen.js';

const TestComponent = defineComponent({
  setup() {
    useMessageBoardAutoOpen();
    return () => h('div');
  },
});

describe('useMessageBoardAutoOpen', () => {
  beforeEach(() => {
    websocketMocks.onMessage.mockClear();
    websocketMocks.offMessage.mockClear();
  });

  it('registers and unregisters the newMessage handler', async () => {
    const view = render(TestComponent);
    await nextTick();

    expect(websocketMocks.onMessage).toHaveBeenCalledWith(
      'newMessage',
      expect.any(Function)
    );

    view.unmount();

    expect(websocketMocks.offMessage).toHaveBeenCalledWith(
      'newMessage',
      expect.any(Function)
    );
  });
});
