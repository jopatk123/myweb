import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import MessageList from '@/components/message-board/MessageList.vue';
import { measureTextOverflow } from '@/utils/messageTextOverflow.js';

const toast = vi.hoisted(() => ({ showError: null }));

vi.mock('@/composables/useGlobalToast.js', async () => {
  const state = { showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() };
  toast.showError = state.showError;
  return { useGlobalToast: () => state };
});

vi.mock('@/utils/messageTextOverflow.js', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    measureTextOverflow: vi.fn(),
  };
});

vi.mock('@/components/message-board/ImagePreview.vue', () => ({
  default: {
    name: 'ImagePreviewStub',
    props: ['images'],
    template: '<div class="image-preview-stub">图片 {{ images.length }}</div>',
  },
}));

const baseProps = {
  messages: [
    {
      id: 1,
      authorName: 'Alice',
      authorColor: '#ff0000',
      content: '测试留言',
      createdAt: '2026-04-06T10:00:00.000Z',
      images: [],
    },
  ],
  loading: false,
  hasMessages: true,
  error: '',
  formatTime: () => '刚刚',
  isSearching: false,
  searchQuery: '',
  sendSuccessToken: 0,
};

const setupClipboardMock = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return writeText;
};

describe('MessageList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toast.showError.mockClear();
    vi.mocked(measureTextOverflow).mockReturnValue(false);
  });

  it('shows a compact load-more control without pagination chrome', () => {
    const { getByRole, queryByText } = render(MessageList, {
      props: {
        ...baseProps,
        canLoadMore: true,
        loadingMore: false,
      },
    });

    expect(getByRole('button', { name: '加载更早留言' })).toBeInTheDocument();
    expect(queryByText(/第 .* 页/)).toBeNull();
  });

  it('emits request-delete when delete button is clicked', async () => {
    const { getByRole, emitted } = render(MessageList, {
      props: {
        ...baseProps,
        deletingMessageId: null,
      },
    });

    await fireEvent.click(getByRole('button', { name: '删除' }));

    expect(emitted()['request-delete']).toBeTruthy();
    expect(emitted()['request-delete'][0][0]).toMatchObject({ id: 1 });
  });

  it('shows deleting state for the active message', () => {
    const { getByRole } = render(MessageList, {
      props: {
        ...baseProps,
        deletingMessageId: 1,
      },
    });

    expect(getByRole('button', { name: '删除中...' })).toBeDisabled();
  });

  it('auto-expands message text while searching', async () => {
    vi.mocked(measureTextOverflow).mockReturnValue(true);

    const longContent = '搜索时应完整展示的长留言内容';
    const { queryByRole, getByText } = render(MessageList, {
      props: {
        ...baseProps,
        messages: [
          {
            ...baseProps.messages[0],
            content: longContent,
          },
        ],
        isSearching: true,
        searchQuery: '长留言',
      },
    });
    await flushPromises();

    expect(getByText(longContent)).toBeInTheDocument();
    expect(queryByRole('button', { name: '展开' })).toBeNull();
  });

  it('copies message content to the clipboard when copy button is clicked', async () => {
    const writeText = setupClipboardMock();

    const { getByRole } = render(MessageList, {
      props: {
        ...baseProps,
        deletingMessageId: null,
      },
    });

    await fireEvent.click(getByRole('button', { name: '复制' }));

    expect(writeText).toHaveBeenCalledWith('测试留言');
  });

  it('shows transient copied feedback after a successful copy', async () => {
    vi.useFakeTimers();
    try {
      setupClipboardMock();
      const { getByRole, queryByRole } = render(MessageList, {
        props: baseProps,
      });

      await fireEvent.click(getByRole('button', { name: '复制' }));
      await Promise.resolve();
      await Promise.resolve();

      expect(getByRole('button', { name: '已复制' })).toBeInTheDocument();
      vi.advanceTimersByTime(1300);
      await Promise.resolve();
      expect(queryByRole('button', { name: '已复制' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows an error toast when copying fails', async () => {
    setupClipboardMock().mockRejectedValue(new Error('denied'));
    const { getByRole } = render(MessageList, { props: baseProps });

    await fireEvent.click(getByRole('button', { name: '复制' }));
    await flushPromises();

    expect(toast.showError).toHaveBeenCalledWith(
      '复制失败，请手动选择文本后复制'
    );
  });

  it('disables copy for messages without text content', () => {
    const { getByRole } = render(MessageList, {
      props: {
        ...baseProps,
        messages: [{ ...baseProps.messages[0], content: '' }],
      },
    });

    expect(getByRole('button', { name: '复制' })).toBeDisabled();
  });

  it('renders the image preview block only for messages with images', () => {
    const withImages = render(MessageList, {
      props: {
        ...baseProps,
        messages: [
          { ...baseProps.messages[0], images: [{ id: 9, path: 'a.png' }] },
        ],
      },
    });
    expect(
      withImages.container.querySelector('.image-preview-stub')
    ).not.toBeNull();
    withImages.unmount();

    const withoutImages = render(MessageList, { props: baseProps });
    expect(
      withoutImages.container.querySelector('.image-preview-stub')
    ).toBeNull();
  });

  it('shows the loading placeholder only before messages arrive', () => {
    const initial = render(MessageList, {
      props: { ...baseProps, loading: true, hasMessages: false, messages: [] },
    });
    expect(initial.getByText('加载中...')).toBeInTheDocument();
    initial.unmount();

    const refreshing = render(MessageList, {
      props: { ...baseProps, loading: true },
    });
    expect(refreshing.queryByText('加载中...')).toBeNull();
  });

  it('shows an error banner with a working retry button', async () => {
    const { getByText, getByRole, emitted } = render(MessageList, {
      props: { ...baseProps, error: '网络异常' },
    });

    expect(getByText('网络异常')).toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: '重试' }));

    expect(emitted().retry).toHaveLength(1);
  });

  it('distinguishes empty states between search and normal mode', () => {
    const searching = render(MessageList, {
      props: {
        ...baseProps,
        hasMessages: false,
        messages: [],
        isSearching: true,
        searchQuery: 'alice',
      },
    });
    expect(
      searching.getByText(/没有找到与“alice”相关的留言/)
    ).toBeInTheDocument();
    searching.unmount();

    const normal = render(MessageList, {
      props: { ...baseProps, hasMessages: false, messages: [] },
    });
    expect(normal.getByText('还没有留言，来发第一条吧！')).toBeInTheDocument();
  });

  it('emits request-load-more and disables the control while loading', async () => {
    const idle = render(MessageList, {
      props: { ...baseProps, canLoadMore: true, loadingMore: false },
    });
    await fireEvent.click(idle.getByRole('button', { name: '加载更早留言' }));
    expect(idle.emitted()['request-load-more']).toHaveLength(1);
    idle.unmount();

    const busy = render(MessageList, {
      props: { ...baseProps, canLoadMore: true, loadingMore: true },
    });
    const btn = busy.getByRole('button', { name: '加载中...' });
    expect(btn).toBeDisabled();
  });

  const mockScrollMetrics = el => {
    el.scrollTo = vi.fn();
    Object.defineProperty(el, 'scrollHeight', {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(el, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    return el;
  };

  const newIncomingMessage = {
    id: 2,
    authorName: 'Bob',
    authorColor: '#00ff00',
    content: '新消息',
    createdAt: '2026-04-06T11:00:00.000Z',
    images: [],
  };

  it('auto-scrolls to bottom when a new message arrives near the bottom', async () => {
    const view = render(MessageList, { props: baseProps });
    const el = mockScrollMetrics(view.container.querySelector('.message-list'));

    await view.rerender({
      messages: [...baseProps.messages, newIncomingMessage],
    });
    await flushPromises();

    expect(el.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: 'smooth',
    });
  });

  it('suppresses auto-scroll while the user is scrolling', async () => {
    const view = render(MessageList, { props: baseProps });
    const el = mockScrollMetrics(view.container.querySelector('.message-list'));

    await fireEvent.wheel(el);
    await view.rerender({
      messages: [...baseProps.messages, newIncomingMessage],
    });
    await flushPromises();

    // 挂载时的初始滚动是 behavior: 'auto'，新消息触发的 smooth 滚动应被抑制
    expect(el.scrollTo).not.toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    );
  });

  it('forces a scroll to bottom when the send succeeds', async () => {
    const view = render(MessageList, { props: baseProps });
    const el = mockScrollMetrics(view.container.querySelector('.message-list'));

    await view.rerender({ sendSuccessToken: 1 });
    await flushPromises();

    expect(el.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: 'smooth',
    });
  });

  it('hands the scroll container to the parent via listRef and clears it on unmount', () => {
    const listRef = vi.fn();
    const view = render(MessageList, { props: { ...baseProps, listRef } });

    const el = view.container.querySelector('.message-list');
    expect(el).not.toBeNull();
    // 父组件依赖这个元素在"加载更多"后恢复滚动位置，回传必须是真实容器
    expect(listRef).toHaveBeenCalledWith(el);

    view.unmount();
    expect(listRef).toHaveBeenLastCalledWith(null);
  });
});
