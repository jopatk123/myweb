import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import MessageBoardHeader from '@/components/message-board/MessageBoardHeader.vue';

const baseProps = {
  isConnected: true,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  searchQuery: '',
  searchCount: 0,
  loading: false,
  isSearching: false,
};

describe('MessageBoardHeader', () => {
  it('keeps a single toolbar without repeating the window title or close button', () => {
    const { queryByRole, queryByText, getByLabelText } = render(
      MessageBoardHeader,
      { props: baseProps }
    );

    expect(queryByText('留言板')).toBeNull();
    expect(queryByRole('button', { name: '关闭' })).toBeNull();
    expect(getByLabelText('搜索留言或作者')).toBeInTheDocument();
    expect(getByLabelText('打开设置')).toBeInTheDocument();
  });

  it('emits search updates from the compact search field', async () => {
    const { getByLabelText, emitted } = render(MessageBoardHeader, {
      props: baseProps,
    });

    await fireEvent.update(getByLabelText('搜索留言或作者'), 'alice');

    expect(emitted()['update:search-query'][0][0]).toBe('alice');
  });
});
