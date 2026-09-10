import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import MessageText from '@/components/message-board/MessageText.vue';
import { measureTextOverflow } from '@/utils/messageTextOverflow.js';

vi.mock('@/utils/messageTextOverflow.js', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    measureTextOverflow: vi.fn(),
  };
});

describe('MessageText', () => {
  beforeEach(() => {
    vi.mocked(measureTextOverflow).mockReset();
  });

  it('does not show toggle for short content', async () => {
    vi.mocked(measureTextOverflow).mockReturnValue(false);

    const { queryByRole, getByText } = render(MessageText, {
      props: { content: '短留言' },
    });
    await flushPromises();

    expect(getByText('短留言')).toBeInTheDocument();
    expect(queryByRole('button', { name: '展开' })).toBeNull();
  });

  it('shows expand button and expands to full text on click', async () => {
    vi.mocked(measureTextOverflow).mockReturnValue(true);

    const longContent = '这是一段很长的留言内容';
    const { getByRole, getByText } = render(MessageText, {
      props: { content: longContent },
    });
    await flushPromises();

    expect(getByRole('button', { name: '展开' })).toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: '展开' }));

    expect(getByRole('button', { name: '收起' })).toBeInTheDocument();
    expect(getByText(longContent)).toBeInTheDocument();
  });

  it('collapses back when collapse button is clicked', async () => {
    vi.mocked(measureTextOverflow).mockReturnValue(true);

    const { getByRole } = render(MessageText, {
      props: { content: '可折叠的长留言' },
    });
    await flushPromises();

    await fireEvent.click(getByRole('button', { name: '展开' }));
    await fireEvent.click(getByRole('button', { name: '收起' }));

    expect(getByRole('button', { name: '展开' })).toBeInTheDocument();
  });

  it('forceExpanded hides toggle and shows full content', async () => {
    vi.mocked(measureTextOverflow).mockReturnValue(true);

    const content = '搜索时应完整展示的留言';
    const { queryByRole, getByText } = render(MessageText, {
      props: { content, forceExpanded: true },
    });
    await flushPromises();

    expect(getByText(content)).toBeInTheDocument();
    expect(queryByRole('button', { name: '展开' })).toBeNull();
    expect(queryByRole('button', { name: '收起' })).toBeNull();
  });
});
