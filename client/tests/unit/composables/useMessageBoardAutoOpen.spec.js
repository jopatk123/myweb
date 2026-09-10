import { defineComponent, h, nextTick } from 'vue';
import { render } from '@testing-library/vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const websocketMocks = vi.hoisted(() => ({
  onMessage: vi.fn(),
  offMessage: vi.fn(),
}));

const windowMocks = vi.hoisted(() => ({
  createWindow: vi.fn(),
  findWindowByAppAll: vi.fn(() => null),
  setActiveWindow: vi.fn(),
  showWindowWithoutFocus: vi.fn(),
}));

vi.mock('@/composables/useWebSocket.js', () => ({
  useWebSocket: () => websocketMocks,
}));

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: () => windowMocks,
}));

vi.mock('@/apps/registry.js', () => ({
  getAppComponentBySlug: () => null,
  getAppMetaBySlug: () => ({
    slug: 'message-board',
    name: '留言板',
    preferredSize: { width: 610, height: 800 },
  }),
}));

import { useMessageBoardAutoOpen } from '@/composables/useMessageBoardAutoOpen.js';
import {
  messageBoardState,
  syncAutoOpenEnabled,
} from '@/store/messageBoardState.js';

const TestComponent = defineComponent({
  setup() {
    useMessageBoardAutoOpen();
    return () => h('div');
  },
});

/** 渲染测试组件并捕获注册的 newMessage 处理器 */
async function renderAndCaptureHandler() {
  const view = render(TestComponent);
  await nextTick();
  const registration = websocketMocks.onMessage.mock.calls.find(
    ([event]) => event === 'newMessage'
  );
  const handler = registration?.[1];
  expect(handler).toBeTypeOf('function');
  return { view, handler };
}

describe('useMessageBoardAutoOpen', () => {
  beforeEach(() => {
    websocketMocks.onMessage.mockClear();
    websocketMocks.offMessage.mockClear();
    windowMocks.createWindow.mockClear();
    windowMocks.findWindowByAppAll.mockClear();
    windowMocks.findWindowByAppAll.mockReturnValue(null);
    windowMocks.showWindowWithoutFocus.mockClear();
    messageBoardState.autoOpenEnabled = false;
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

  it('does not auto-open when local toggle is disabled', async () => {
    const { handler } = await renderAndCaptureHandler();

    handler({ message: { id: 1 } });

    expect(windowMocks.createWindow).not.toHaveBeenCalled();
  });

  it('auto-opens the board on newMessage when local toggle is enabled', async () => {
    syncAutoOpenEnabled(true);
    const { handler } = await renderAndCaptureHandler();

    handler({ message: { id: 2 } });

    expect(windowMocks.createWindow).toHaveBeenCalledTimes(1);
    expect(windowMocks.createWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        appSlug: 'message-board',
        activate: false,
        title: '留言板',
        width: 610,
        height: 800,
      })
    );
  });

  it('shows the existing window without stealing focus when already created', async () => {
    syncAutoOpenEnabled(true);
    const { handler } = await renderAndCaptureHandler();
    windowMocks.findWindowByAppAll.mockReturnValueOnce({ id: 42 });

    handler({ message: { id: 3 } });

    expect(windowMocks.createWindow).not.toHaveBeenCalled();
    expect(windowMocks.showWindowWithoutFocus).toHaveBeenCalledWith(42);
  });
});
