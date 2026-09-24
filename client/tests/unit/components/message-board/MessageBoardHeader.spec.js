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

  it('marks the connection as connected', () => {
    const { getByText } = render(MessageBoardHeader, {
      props: { ...baseProps, isConnected: true },
    });

    expect(getByText('已连接')).toHaveClass('connected');
  });

  it('reports the reconnection progress while retrying', () => {
    const { getByText } = render(MessageBoardHeader, {
      props: { ...baseProps, isConnected: false, reconnectAttempts: 2 },
    });

    expect(getByText('重连 2/5')).toHaveClass('reconnecting');
  });

  it('falls back to disconnected once retries are exhausted', () => {
    const { getByText } = render(MessageBoardHeader, {
      props: {
        ...baseProps,
        isConnected: false,
        reconnectAttempts: 5,
        maxReconnectAttempts: 5,
      },
    });

    expect(getByText('未连接')).toHaveClass('disconnected');
  });

  it('shows a plain disconnected badge when never connected', () => {
    const { getByText } = render(MessageBoardHeader, {
      props: { ...baseProps, isConnected: false },
    });

    expect(getByText('未连接')).toHaveClass('disconnected');
  });

  it('only offers the clear button while a search query is present', async () => {
    const idle = render(MessageBoardHeader, { props: baseProps });
    expect(idle.queryByLabelText('清除搜索')).toBeNull();
    idle.unmount();

    const active = render(MessageBoardHeader, {
      props: { ...baseProps, searchQuery: 'alice' },
    });
    await fireEvent.click(active.getByLabelText('清除搜索'));

    expect(active.emitted()['update:search-query'][0][0]).toBe('');
  });

  it('shows the matching result count while searching', () => {
    const idle = render(MessageBoardHeader, {
      props: { ...baseProps, searchCount: 12 },
    });
    expect(idle.queryByText('12 条')).toBeNull();
    idle.unmount();

    const searching = render(MessageBoardHeader, {
      props: { ...baseProps, isSearching: true, searchCount: 12 },
    });
    expect(searching.getByText('12 条')).toBeInTheDocument();
  });

  it('shows a searching hint instead of the count while loading', () => {
    const { getByText } = render(MessageBoardHeader, {
      props: {
        ...baseProps,
        isSearching: true,
        loading: true,
        searchCount: 12,
      },
    });

    expect(getByText('搜索中...')).toBeInTheDocument();
  });

  it('emits toggle-settings from the settings button', async () => {
    const { getByLabelText, emitted } = render(MessageBoardHeader, {
      props: baseProps,
    });

    await fireEvent.click(getByLabelText('打开设置'));

    expect(emitted()['toggle-settings']).toHaveLength(1);
  });
});
