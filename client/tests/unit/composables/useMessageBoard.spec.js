/**
 * useMessageBoard 核心行为测试
 *
 * 重点验证：message.js 切换到 createApiClient 后，composable 能正确读取
 * 已解包的响应 { code, data: { messages, pagination } }，并在真实组件作用域中
 * 注册生命周期与 WebSocket 处理器。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
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

const windowManagerMocks = vi.hoisted(() => ({
  findWindowByAppAll: vi.fn(() => null),
  createWindow: vi.fn(),
  showWindowWithoutFocus: vi.fn(),
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
  useWindowManager: () => windowManagerMocks,
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
    windowManagerMocks.findWindowByAppAll.mockImplementation(() => null);
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

    // 非字符串搜索词会被丢弃
    await state.fetchMessages({ page: 1, search: 123 });
    expect(apiMocks.getMessages).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ q: expect.anything() })
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

  it('deleteMessage proxies success, non-200 and failure states', async () => {
    apiMocks.deleteMessage.mockResolvedValue({ code: 200, data: true });

    const { wrapper, state } = await mountState();
    await expect(state.deleteMessage(3)).resolves.toBe(true);

    apiMocks.deleteMessage.mockResolvedValue({ code: 500 });
    await expect(state.deleteMessage(3)).resolves.toBeUndefined();
    expect(state.error.value).toBeNull();

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
    wrapper.unmount();

    expect(webSocketMocks.offMessage).toHaveBeenCalledWith(
      'messagesCleared',
      expect.any(Function)
    );
  });

  it('loadMoreMessages prepends older pages and keeps ascending order', async () => {
    // 第一页由 mountState 挂载时的首次拉取消费
    apiMocks.getMessages
      .mockResolvedValueOnce({
        code: 200,
        data: {
          messages: [{ id: 2 }],
          pagination: { page: 1, limit: 50, total: 3, totalPages: 2 },
        },
      })
      .mockResolvedValueOnce({
        code: 200,
        data: {
          messages: [{ id: 1 }],
          pagination: { page: 2, limit: 50, total: 3, totalPages: 2 },
        },
      });

    const { wrapper, state } = await mountState();
    await state.loadMoreMessages();

    expect(state.messages.value.map(m => m.id)).toEqual([1, 2]);
    expect(state.pagination.page).toBe(2);
    expect(apiMocks.getMessages).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 50 })
    );
    wrapper.unmount();
  });

  it('loadMoreMessages is guarded by pages, loading flags and records errors', async () => {
    const { wrapper, state } = await mountState();

    await state.loadMoreMessages(); // 没有更多页
    expect(apiMocks.getMessages).not.toHaveBeenCalled();

    state.loadingMore.value = true;
    await state.loadMoreMessages();
    expect(apiMocks.getMessages).not.toHaveBeenCalled();
    state.loadingMore.value = false;

    state.pagination.totalPages = 2;
    apiMocks.getMessages.mockRejectedValueOnce(new Error('分页失败'));
    await state.loadMoreMessages();
    expect(state.error.value).toBe('分页失败');
    wrapper.unmount();
  });

  it('sendMessage appends the new message and syncs the message-board window', async () => {
    apiMocks.getMessages.mockResolvedValue({
      code: 200,
      data: {
        messages: [{ id: 1 }],
        pagination: { page: 1, limit: 2, total: 1, totalPages: 1 },
      },
    });
    apiMocks.sendMessage.mockResolvedValue({
      code: 200,
      data: { id: 2, content: '新' },
    });

    const { wrapper, state } = await mountState();
    await state.fetchMessages();

    const created = await state.sendMessage('新');
    expect(created).toEqual({ id: 2, content: '新' });
    expect(state.messages.value.map(m => m.id)).toEqual([1, 2]);
    expect(state.pagination.total).toBe(2);
    expect(windowManagerMocks.createWindow).toHaveBeenCalledWith(
      expect.objectContaining({ appSlug: 'message-board', title: '留言板' })
    );
    wrapper.unmount();
  });

  it('sendMessage dedupes ids and trims overflow beyond the pagination limit', async () => {
    apiMocks.getMessages.mockResolvedValue({
      code: 200,
      data: {
        messages: [{ id: 1 }],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      },
    });
    apiMocks.sendMessage.mockResolvedValue({ code: 200, data: { id: 2 } });

    const { wrapper, state } = await mountState();
    await state.fetchMessages();

    await state.sendMessage('新');
    expect(state.messages.value.map(m => m.id)).toEqual([2]);
    expect(state.pagination.total).toBe(2);

    await state.sendMessage('重复推送同一条');
    expect(state.messages.value.map(m => m.id)).toEqual([2]);
    expect(state.pagination.total).toBe(2);
    wrapper.unmount();
  });

  it('sendMessage allows image-only payloads and keeps the search view clean', async () => {
    apiMocks.sendMessage.mockResolvedValue({
      code: 200,
      data: { id: 5, images: ['a.png'] },
    });

    const { wrapper, state } = await mountState();
    await state.sendMessage('', ['a.png'], 'url');
    expect(apiMocks.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '',
        images: ['a.png'],
        imageType: 'url',
      })
    );

    // 搜索视图下发送不追加到当前列表
    state.searchQuery.value = '关键词';
    await nextTick();
    const before = state.messages.value.length;
    await state.sendMessage('搜索态发送');
    expect(state.messages.value.length).toBe(before);
    wrapper.unmount();
  });

  it('syncMessageBoardWindow reveals or manually shows an existing window', async () => {
    const existing = { id: 7, minimized: true, visible: false };
    windowManagerMocks.findWindowByAppAll.mockReturnValueOnce(existing);
    apiMocks.sendMessage.mockResolvedValue({ code: 200, data: { id: 3 } });

    const { wrapper, state } = await mountState();
    await state.sendMessage('同步窗口');
    expect(windowManagerMocks.showWindowWithoutFocus).toHaveBeenCalledWith(7);

    // 展示失败时回退为直接改可见性
    const fallback = { id: 8, minimized: true, visible: false };
    windowManagerMocks.findWindowByAppAll.mockReturnValueOnce(fallback);
    windowManagerMocks.showWindowWithoutFocus.mockImplementationOnce(() => {
      throw new Error('展示失败');
    });
    await state.sendMessage('再次同步');
    expect(fallback.minimized).toBe(false);
    expect(fallback.visible).toBe(true);
    wrapper.unmount();
  });

  it('reacts to websocket newMessage / messageDeleted / messagesCleared events', async () => {
    const { wrapper, state } = await mountState();
    const handlers = Object.fromEntries(webSocketMocks.onMessage.mock.calls);

    handlers.newMessage({ message: { id: 10, content: '新消息' } });
    expect(state.messages.value.map(m => m.id)).toEqual([10]);
    expect(state.pagination.total).toBe(1);

    handlers.newMessage({ message: { id: 10 } }); // 去重
    expect(state.messages.value).toHaveLength(1);
    expect(state.pagination.total).toBe(1);

    handlers.messageDeleted({ messageId: 10 });
    expect(state.messages.value).toEqual([]);
    expect(state.pagination.total).toBe(0);

    handlers.newMessage({ message: { id: 11 } });
    handlers.messagesCleared();
    expect(state.messages.value).toEqual([]);
    expect(state.pagination.total).toBe(0);
    wrapper.unmount();
  });

  it('ignores realtime pushes while a search is active', async () => {
    const { wrapper, state } = await mountState();
    const handlers = Object.fromEntries(webSocketMocks.onMessage.mock.calls);

    state.searchQuery.value = '关键词';
    await nextTick(); // 触发 watch（防抖计时器在卸载时清理）

    handlers.newMessage({ message: { id: 99 } });
    expect(state.messages.value).toEqual([]);

    handlers.messageDeleted({ messageId: 1 });
    expect(state.pagination.total).toBe(0);
    wrapper.unmount();
  });

  it('debounces search input into a single refreshed fetch', async () => {
    const { wrapper, state } = await mountState();
    vi.useFakeTimers();
    apiMocks.getMessages.mockClear();

    state.setSearchQuery('  关键词  ');
    await vi.advanceTimersByTimeAsync(299);
    expect(apiMocks.getMessages).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10);
    expect(apiMocks.getMessages).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, q: '关键词' })
    );
    wrapper.unmount();
  });

  it('formatTime renders relative labels and colors stay in the palette', async () => {
    const { wrapper, state } = await mountState();
    const now = Date.now();
    expect(state.formatTime(now)).toBe('刚刚');
    expect(state.formatTime(now - 5 * 60000)).toBe('5分钟前');
    expect(state.formatTime(now - 2 * 3600000)).toBe('2小时前');
    const longAgo = new Date(now - 2 * 86400000);
    expect(state.formatTime(longAgo)).toBe(
      longAgo.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
    expect(state.generateRandomColor()).toMatch(/^#[0-9a-f]{6}$/i);
    wrapper.unmount();
  });

  it('fetchUserSettings failures during mount keep the defaults intact', async () => {
    apiMocks.getUserSettings.mockRejectedValue(new Error('设置加载失败'));
    const { wrapper, state } = await mountState();
    expect(state.userSettings.nickname).toBe('Anonymous');
    expect(state.userSettings.autoOpenEnabled).toBe(false);
    wrapper.unmount();
  });

  it('updateUserSettings and uploadImages record and rethrow failures', async () => {
    const { wrapper, state } = await mountState();

    apiMocks.updateUserSettings.mockRejectedValue(new Error('更新失败'));
    await expect(state.updateUserSettings({ nickname: 'X' })).rejects.toThrow(
      '更新失败'
    );
    expect(state.error.value).toBe('更新失败');

    apiMocks.uploadImages.mockRejectedValue(new Error('上传失败'));
    await expect(state.uploadImages(['f'])).rejects.toThrow('上传失败');
    expect(state.error.value).toBe('上传失败');
    wrapper.unmount();
  });
});
