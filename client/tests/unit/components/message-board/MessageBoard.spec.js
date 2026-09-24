import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import MessageBoard from '@/components/message-board/MessageBoard.vue';

// ---- composable mocks（holder 模式） ----
const board = vi.hoisted(() => ({ current: null }));
const toasts = vi.hoisted(() => ({ success: null, error: null }));

vi.mock('@/composables/useMessageBoard.js', async () => {
  const { ref, reactive, computed } = await import('vue');
  const state = {
    messages: ref([]),
    loading: ref(false),
    loadingMore: ref(false),
    sending: ref(false),
    error: ref(null),
    userSettings: reactive({
      nickname: 'Anonymous',
      avatarColor: '#007bff',
      autoOpenEnabled: false,
    }),
    pagination: reactive({ page: 1, limit: 50, total: 0, totalPages: 0 }),
    isConnected: ref(false),
    reconnectAttempts: ref(0),
    maxReconnectAttempts: ref(5),
    searchQuery: ref(''),
    formatTime: vi.fn(() => '刚刚'),
    generateRandomColor: vi.fn(() => '#random'),
    fetchMessages: vi.fn(async () => {}),
    loadMoreMessages: vi.fn(async () => {}),
    sendMessage: vi.fn(async () => ({ id: 99 })),
    uploadImages: vi.fn(async () => [{ url: 'blob:x' }]),
    deleteMessage: vi.fn(async () => true),
    clearAllMessages: vi.fn(async () => ({
      deletedMessages: 0,
      deletedImages: 0,
    })),
    updateUserSettings: vi.fn(async () => ({})),
  };
  state.hasMessages = computed(() => state.messages.value.length > 0);
  state.canLoadMore = computed(
    () => state.pagination.page < state.pagination.totalPages
  );
  state.isSearching = computed(() => state.searchQuery.value.trim().length > 0);
  state.setSearchQuery = vi.fn(value => {
    state.searchQuery.value = value || '';
  });
  board.current = state;
  return { useMessageBoard: () => state };
});

vi.mock('@/composables/useGlobalToast.js', async () => {
  const state = {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
  };
  toasts.success = state.showSuccess;
  toasts.error = state.showError;
  return { useGlobalToast: () => state };
});

// ---- 子组件桩 ----
vi.mock('@/components/message-board/MessageBoardHeader.vue', () => ({
  default: {
    name: 'HeaderStub',
    props: ['searchQuery', 'searchCount', 'loading', 'isSearching'],
    emits: ['update:search-query', 'toggle-settings'],
    template: `<header class="header-stub">
      <button class="h-search" @click="$emit('update:search-query', 'keyword')"></button>
      <button class="h-toggle" @click="$emit('toggle-settings')"></button>
    </header>`,
  },
}));

vi.mock('@/components/message-board/MessageList.vue', () => ({
  default: {
    name: 'ListStub',
    props: ['messages', 'deletingMessageId', 'listRef', 'sendSuccessToken'],
    emits: ['request-delete', 'request-load-more', 'retry'],
    template: `<div class="list-stub">
      <button class="l-delete" @click="$emit('request-delete', messages[0])"></button>
      <button class="l-load-more" @click="$emit('request-load-more')"></button>
      <button class="l-retry" @click="$emit('retry')"></button>
    </div>`,
  },
}));

vi.mock('@/components/message-board/MessageInput.vue', () => ({
  default: {
    name: 'InputStub',
    props: ['sending', 'sendSuccessToken'],
    emits: ['send'],
    data: () => ({ stubFiles: [{ name: 'a.png' }] }),
    template: `<div class="input-stub">
      <button class="i-send-text" @click="$emit('send', { text: 'hello', files: [] })"></button>
      <button class="i-send-files" @click="$emit('send', { text: '看图', files: stubFiles })"></button>
    </div>`,
  },
}));

vi.mock('@/components/message-board/MessageBoardSettings.vue', () => ({
  default: {
    name: 'SettingsStub',
    props: ['modelValue'],
    emits: ['update:modelValue', 'save', 'cancel', 'request-clear'],
    template: `<div class="settings-stub">
      <button class="s-edit" @click="$emit('update:modelValue', { nickname: 'Bob', avatarColor: '#654321', autoOpenEnabled: true })"></button>
      <button class="s-save" @click="$emit('save')"></button>
      <button class="s-cancel" @click="$emit('cancel')"></button>
      <button class="s-clear" @click="$emit('request-clear')"></button>
    </div>`,
  },
}));

vi.mock('@/components/message-board/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmStub',
    props: ['visible', 'title', 'lines', 'confirmText'],
    emits: ['cancel', 'confirm'],
    template: `<div class="confirm-stub">
      <span class="c-title">{{ title }}</span>
      <button class="c-confirm" @click="$emit('confirm')"></button>
      <button class="c-cancel" @click="$emit('cancel')"></button>
    </div>`,
  },
}));

const findStub = (wrapper, name) => wrapper.findComponent({ name });

describe('MessageBoard', () => {
  const mountBoard = () => mount(MessageBoard);

  beforeEach(() => {
    const s = board.current;
    s.messages.value = [];
    s.loading.value = false;
    s.loadingMore.value = false;
    s.sending.value = false;
    s.error.value = null;
    s.searchQuery.value = '';
    s.pagination.total = 0;
    s.pagination.page = 1;
    s.pagination.totalPages = 0;
    Object.assign(s.userSettings, {
      nickname: 'Anonymous',
      avatarColor: '#007bff',
      autoOpenEnabled: false,
    });
    vi.clearAllMocks();
  });

  it('wires search query updates to the board composable', async () => {
    const wrapper = mountBoard();
    await findStub(wrapper, 'HeaderStub').find('.h-search').trigger('click');

    expect(board.current.setSearchQuery).toHaveBeenCalledWith('keyword');
    wrapper.unmount();
  });

  it('toggles the settings panel from the header', async () => {
    const wrapper = mountBoard();
    expect(findStub(wrapper, 'SettingsStub').exists()).toBe(false);

    await findStub(wrapper, 'HeaderStub').find('.h-toggle').trigger('click');
    expect(findStub(wrapper, 'SettingsStub').exists()).toBe(true);

    await findStub(wrapper, 'HeaderStub').find('.h-toggle').trigger('click');
    expect(findStub(wrapper, 'SettingsStub').exists()).toBe(false);
    wrapper.unmount();
  });

  it('sends plain text messages and bumps the success token', async () => {
    const wrapper = mountBoard();
    const input = findStub(wrapper, 'InputStub');
    expect(input.props('sendSuccessToken')).toBe(0);

    await input.find('.i-send-text').trigger('click');
    await flushPromises();

    expect(board.current.sendMessage).toHaveBeenCalledWith('hello', null, null);
    expect(input.props('sendSuccessToken')).toBe(1);
    wrapper.unmount();
  });

  it('uploads images first and sends with the upload result', async () => {
    const wrapper = mountBoard();
    await findStub(wrapper, 'InputStub').find('.i-send-files').trigger('click');
    await flushPromises();

    expect(board.current.uploadImages).toHaveBeenCalledTimes(1);
    expect(board.current.sendMessage).toHaveBeenCalledWith(
      '看图',
      [{ url: 'blob:x' }],
      'upload'
    );
    expect(findStub(wrapper, 'InputStub').props('sendSuccessToken')).toBe(1);
    wrapper.unmount();
  });

  it('does not bump the success token when sending fails', async () => {
    board.current.sendMessage.mockRejectedValueOnce(new Error('bad'));
    const wrapper = mountBoard();
    await findStub(wrapper, 'InputStub').find('.i-send-text').trigger('click');
    await flushPromises();

    expect(findStub(wrapper, 'InputStub').props('sendSuccessToken')).toBe(0);
    wrapper.unmount();
  });

  it('asks for confirmation with a content preview before deleting', async () => {
    board.current.messages.value = [
      { id: 7, authorName: 'Alice', content: '这条留言需要被删除' },
    ];
    const wrapper = mountBoard();
    const confirms = wrapper.findAllComponents({ name: 'ConfirmStub' });
    expect(confirms[1].props('visible')).toBe(false);

    await findStub(wrapper, 'ListStub').find('.l-delete').trigger('click');
    expect(confirms[1].props('visible')).toBe(true);
    expect(confirms[1].props('lines')[0]).toContain('将删除 Alice 的留言');
    expect(confirms[1].props('lines')[0]).toContain('这条留言需要被删除');
    wrapper.unmount();
  });

  it('truncates long content and handles image-only messages in the dialog', async () => {
    const longText = 'x'.repeat(60);
    const wrapper = mountBoard();
    const getDialogLines = () =>
      wrapper.findAllComponents({ name: 'ConfirmStub' })[1].props('lines');

    board.current.messages.value = [
      { id: 1, authorName: 'Bob', content: longText },
    ];
    await nextTick();
    await findStub(wrapper, 'ListStub').find('.l-delete').trigger('click');
    expect(getDialogLines()[0]).toContain(`“${'x'.repeat(40)}...”`);

    await wrapper
      .findAllComponents({ name: 'ConfirmStub' })[1]
      .find('.c-cancel')
      .trigger('click');

    board.current.messages.value = [
      { id: 2, authorName: 'Carol', content: '' },
    ];
    await nextTick();
    await findStub(wrapper, 'ListStub').find('.l-delete').trigger('click');
    expect(getDialogLines()[0]).toContain('Carol');
    expect(getDialogLines()[0]).toContain('这条仅包含图片的留言');
    wrapper.unmount();
  });

  it('deletes the pending message on confirm and resets state', async () => {
    board.current.messages.value = [
      { id: 7, authorName: 'Alice', content: 'bye' },
    ];
    const wrapper = mountBoard();
    await findStub(wrapper, 'ListStub').find('.l-delete').trigger('click');

    await wrapper
      .findAllComponents({ name: 'ConfirmStub' })[1]
      .find('.c-confirm')
      .trigger('click');
    await flushPromises();

    expect(board.current.deleteMessage).toHaveBeenCalledWith(7);
    expect(
      wrapper.findAllComponents({ name: 'ConfirmStub' })[1].props('visible')
    ).toBe(false);
    expect(findStub(wrapper, 'ListStub').props('deletingMessageId')).toBeNull();
    wrapper.unmount();
  });

  it('shows a toast when deleting fails', async () => {
    board.current.messages.value = [
      { id: 7, authorName: 'Alice', content: 'bye' },
    ];
    board.current.deleteMessage.mockRejectedValueOnce(
      new Error('network down')
    );
    const wrapper = mountBoard();
    await findStub(wrapper, 'ListStub').find('.l-delete').trigger('click');
    await wrapper
      .findAllComponents({ name: 'ConfirmStub' })[1]
      .find('.c-confirm')
      .trigger('click');
    await flushPromises();

    expect(toasts.error).toHaveBeenCalledWith('删除留言失败: network down');
    expect(findStub(wrapper, 'ListStub').props('deletingMessageId')).toBeNull();
    wrapper.unmount();
  });

  it('cancels the delete dialog without touching the API', async () => {
    board.current.messages.value = [
      { id: 7, authorName: 'Alice', content: 'bye' },
    ];
    const wrapper = mountBoard();
    await findStub(wrapper, 'ListStub').find('.l-delete').trigger('click');
    await wrapper
      .findAllComponents({ name: 'ConfirmStub' })[1]
      .find('.c-cancel')
      .trigger('click');

    expect(board.current.deleteMessage).not.toHaveBeenCalled();
    expect(
      wrapper.findAllComponents({ name: 'ConfirmStub' })[1].props('visible')
    ).toBe(false);
    wrapper.unmount();
  });

  it('clears all messages and reports the deletion summary', async () => {
    board.current.clearAllMessages.mockResolvedValueOnce({
      deletedMessages: 12,
      deletedImages: 3,
    });
    const wrapper = mountBoard();
    await findStub(wrapper, 'HeaderStub').find('.h-toggle').trigger('click');
    await findStub(wrapper, 'SettingsStub').find('.s-clear').trigger('click');
    expect(
      wrapper.findAllComponents({ name: 'ConfirmStub' })[0].props('visible')
    ).toBe(true);

    await wrapper
      .findAllComponents({ name: 'ConfirmStub' })[0]
      .find('.c-confirm')
      .trigger('click');
    await flushPromises();

    expect(board.current.clearAllMessages).toHaveBeenCalledTimes(1);
    expect(toasts.success).toHaveBeenCalledWith(
      '留言板已清空！\n删除了 12 条留言和 3 张图片'
    );
    expect(
      wrapper.findAllComponents({ name: 'ConfirmStub' })[0].props('visible')
    ).toBe(false);
    expect(findStub(wrapper, 'SettingsStub').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows a toast when clearing fails', async () => {
    board.current.clearAllMessages.mockRejectedValueOnce(
      new Error('server busy')
    );
    const wrapper = mountBoard();
    await findStub(wrapper, 'HeaderStub').find('.h-toggle').trigger('click');
    await findStub(wrapper, 'SettingsStub').find('.s-clear').trigger('click');
    await wrapper
      .findAllComponents({ name: 'ConfirmStub' })[0]
      .find('.c-confirm')
      .trigger('click');
    await flushPromises();

    expect(toasts.error).toHaveBeenCalledWith('清除留言板失败: server busy');
    // 失败时保持确认框打开，便于用户重试
    expect(
      wrapper.findAllComponents({ name: 'ConfirmStub' })[0].props('visible')
    ).toBe(true);
    wrapper.unmount();
  });

  it('saves edited settings through v-model and closes the panel', async () => {
    const wrapper = mountBoard();
    await findStub(wrapper, 'HeaderStub').find('.h-toggle').trigger('click');

    await findStub(wrapper, 'SettingsStub').find('.s-edit').trigger('click');
    await findStub(wrapper, 'SettingsStub').find('.s-save').trigger('click');
    await flushPromises();

    expect(board.current.updateUserSettings).toHaveBeenCalledWith({
      nickname: 'Bob',
      avatarColor: '#654321',
      autoOpenEnabled: true,
    });
    expect(findStub(wrapper, 'SettingsStub').exists()).toBe(false);
    wrapper.unmount();
  });

  it('cancels editing and closes the panel without saving', async () => {
    const wrapper = mountBoard();
    await findStub(wrapper, 'HeaderStub').find('.h-toggle').trigger('click');
    await findStub(wrapper, 'SettingsStub').find('.s-edit').trigger('click');
    await findStub(wrapper, 'SettingsStub').find('.s-cancel').trigger('click');
    await nextTick();

    expect(board.current.updateUserSettings).not.toHaveBeenCalled();
    expect(findStub(wrapper, 'SettingsStub').exists()).toBe(false);
    wrapper.unmount();
  });

  it('retries fetching and loads more messages from the list', async () => {
    const wrapper = mountBoard();
    const list = findStub(wrapper, 'ListStub');

    await list.find('.l-retry').trigger('click');
    expect(board.current.fetchMessages).toHaveBeenCalledTimes(1);

    await list.find('.l-load-more').trigger('click');
    expect(board.current.loadMoreMessages).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('binds list element via function ref and restores scroll after loading more', async () => {
    // MessageList 通过函数 ref（setListElement）把滚动容器元素回传给父组件，
    // handleLoadMore 依据加载前后 scrollHeight 的差值恢复 scrollTop，
    // 让用户停留在原先阅读的位置而不是被新加载的旧消息顶走
    const wrapper = mountBoard();
    const list = findStub(wrapper, 'ListStub');

    const listEl = { scrollHeight: 100, scrollTop: 40 };
    expect(typeof list.props('listRef')).toBe('function');
    list.props('listRef')(listEl);

    // 用手动 resolve 的 deferred 阻塞 handleLoadMore，
    // 确保 scrollHeight 的变化发生在"读取旧值之后、计算新值之前"
    let resolveLoad;
    board.current.loadMoreMessages.mockImplementation(
      () => new Promise(resolve => (resolveLoad = resolve))
    );

    await list.find('.l-load-more').trigger('click');
    listEl.scrollHeight = 200; // 历史消息插入后容器变高
    resolveLoad();
    await flushPromises();
    await nextTick();

    expect(board.current.loadMoreMessages).toHaveBeenCalledTimes(1);
    expect(listEl.scrollTop).toBe(140); // 40 + (200 - 100)
    wrapper.unmount();
  });
});
