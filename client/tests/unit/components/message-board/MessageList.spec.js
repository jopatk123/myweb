import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import MessageList from '@/components/message-board/MessageList.vue';
import { measureTextOverflow } from '@/utils/messageTextOverflow.js';

vi.mock('@/utils/messageTextOverflow.js', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    measureTextOverflow: vi.fn(),
  };
});

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
});
