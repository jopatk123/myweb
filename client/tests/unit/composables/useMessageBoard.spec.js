/**
 * useMessageBoard 核心行为测试
 *
 * 重点验证：message.js 切换到 createApiClient 后，composable 能正确读取
 * 已解包的响应 { code, data: { messages, pagination } }，并在真实组件作用域中
 * 注册生命周期与 WebSocket 处理器。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const apiMocks = vi.hoisted(() => ({
  getMessages: vi.fn(),
  getUserSettings: vi.fn(),
  sendMessage: vi.fn(),
  deleteMessage: vi.fn(),
  clearAllMessages: vi.fn(),
  updateUserSettings: vi.fn(),
  uploadImages: vi.fn(),
}));

const webSocketMocks = vi.hoisted(() => ({
  onMessage: vi.fn(),
  offMessage: vi.fn(),
}));

vi.mock('@/api/message.js', () => ({
  messageAPI: apiMocks,
}));

vi.mock('@/composables/useWebSocket.js', () => ({
  useWebSocket: () => ({
    isConnected: { value: false },
    onMessage: webSocketMocks.onMessage,
    offMessage: webSocketMocks.offMessage,
  }),
}));

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: () => ({
    findWindowByAppAll: vi.fn(() => null),
    createWindow: vi.fn(),
    showWindowWithoutFocus: vi.fn(),
  }),
}));

import { useMessageBoard } from '@/composables/useMessageBoard.js';

const mockPagination = { page: 1, limit: 50, total: 0, totalPages: 0 };

async function mountState() {
  let state;

  const Harness = defineComponent({
    name: 'UseMessageBoardHarness',
    setup() {
      state = useMessageBoard();
      return () => h('div');
    },
  });

  const wrapper = mount(Harness);
  await flushPromises();
  apiMocks.getMessages.mockClear();
  apiMocks.getUserSettings.mockClear();

  return { wrapper, state };
}

describe('useMessageBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getMessages.mockResolvedValue({
      code: 200,
      data: { messages: [], pagination: mockPagination },
    });
    apiMocks.getUserSettings.mockResolvedValue({
      code: 200,
      data: { nickname: 'Anon', avatarColor: '#007bff', autoOpenEnabled: 0 },
    });
  });

  it('fetchMessages fills messages when response code is 200', async () => {
    const mockMessages = [
      { id: 1, content: '你好' },
      { id: 2, content: '世界' },
    ];
    apiMocks.getMessages.mockResolvedValue({
      code: 200,
      data: {
        messages: mockMessages,
        pagination: { ...mockPagination, total: 2, totalPages: 1 },
      },
    });

    const { wrapper, state } = await mountState();
    await state.fetchMessages();

    expect(state.messages.value).toEqual(mockMessages);
    expect(state.messages.value).toHaveLength(2);
    wrapper.unmount();
  });

  it('fetchMessages keeps messages empty when response code is not 200', async () => {
    apiMocks.getMessages.mockResolvedValue({ code: 500, data: null });

    const { wrapper, state } = await mountState();
    await state.fetchMessages();

    expect(state.messages.value).toEqual([]);
    wrapper.unmount();
  });

  it('fetchMessages stores network errors without crashing', async () => {
    apiMocks.getMessages.mockRejectedValue(new Error('连接超时'));

    const { wrapper, state } = await mountState();
    await state.fetchMessages();

    expect(state.error.value).toBe('连接超时');
    expect(state.messages.value).toEqual([]);
    wrapper.unmount();
  });

  it('fetchMessages sends pagination and search params', async () => {
    const { wrapper, state } = await mountState();
    await state.fetchMessages({ page: 2, search: '关键字' });

    expect(apiMocks.getMessages).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, q: '关键字', limit: 50 })
    );
    wrapper.unmount();
  });

  it('sendMessage rejects empty text without images', async () => {
    const { wrapper, state } = await mountState();

    await expect(state.sendMessage('', null)).rejects.toThrow(
      '留言内容不能为空'
    );
    expect(apiMocks.sendMessage).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('sendMessage rethrows API errors and stores the error message', async () => {
    apiMocks.sendMessage.mockRejectedValue(new Error('服务器错误'));

    const { wrapper, state } = await mountState();

    await expect(state.sendMessage('测试内容')).rejects.toThrow('服务器错误');
    expect(state.error.value).toBe('服务器错误');
    wrapper.unmount();
  });

  it('deleteMessage proxies success and failure states', async () => {
    apiMocks.deleteMessage.mockResolvedValue({ code: 200, data: true });

    const { wrapper, state } = await mountState();
    await expect(state.deleteMessage(3)).resolves.toBe(true);

    apiMocks.deleteMessage.mockRejectedValue(new Error('删除失败'));
    await expect(state.deleteMessage(3)).rejects.toThrow('删除失败');
    expect(state.error.value).toBe('删除失败');
    wrapper.unmount();
  });

  it('clearAllMessages empties the local list on success', async () => {
    apiMocks.getMessages.mockResolvedValue({
      code: 200,
      data: {
        messages: [{ id: 1, content: '保留前状态' }],
        pagination: { ...mockPagination, total: 1, totalPages: 1 },
      },
    });
    apiMocks.clearAllMessages.mockResolvedValue({ code: 200, data: true });

    const { wrapper, state } = await mountState();
    await state.fetchMessages();
    expect(state.messages.value).toHaveLength(1);

    await state.clearAllMessages();
    expect(state.messages.value).toEqual([]);
    wrapper.unmount();
  });

  it('updateUserSettings normalizes autoOpenEnabled from numeric responses', async () => {
    apiMocks.updateUserSettings.mockResolvedValue({
      code: 200,
      data: {
        nickname: 'Copilot',
        avatarColor: '#111111',
        autoOpenEnabled: 1,
      },
    });

    const { wrapper, state } = await mountState();
    const updated = await state.updateUserSettings({ nickname: 'Copilot' });

    expect(updated.nickname).toBe('Copilot');
    expect(state.userSettings.nickname).toBe('Copilot');
    expect(state.userSettings.autoOpenEnabled).toBe(true);
    wrapper.unmount();
  });

  it('uploadImages returns uploaded image metadata', async () => {
    const uploaded = [{ url: '/uploads/message-images/demo.png' }];
    apiMocks.uploadImages.mockResolvedValue({ code: 200, data: uploaded });

    const { wrapper, state } = await mountState();
    await expect(state.uploadImages(['fake-file'])).resolves.toEqual(uploaded);
    wrapper.unmount();
  });

  it('registers and unregisters websocket handlers with the component lifecycle', async () => {
    const { wrapper } = await mountState();

    expect(webSocketMocks.onMessage).toHaveBeenCalledWith(
      'newMessage',
      expect.any(Function)
    );
    expect(webSocketMocks.onMessage).toHaveBeenCalledWith(
      'messageDeleted',
      expect.any(Function)
    );
    expect(webSocketMocks.onMessage).toHaveBeenCalledWith(
      'messagesCleared',
      expect.any(Function)
    );

    wrapper.unmount();

    expect(webSocketMocks.offMessage).toHaveBeenCalledWith(
      'newMessage',
      expect.any(Function)
    );
    expect(webSocketMocks.offMessage).toHaveBeenCalledWith(
      'messageDeleted',
      expect.any(Function)
    );
    expect(webSocketMocks.offMessage).toHaveBeenCalledWith(
      'messagesCleared',
      expect.any(Function)
    );
  });
});
