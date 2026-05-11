import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import MessageList from '@/components/message-board/MessageList.vue';

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
