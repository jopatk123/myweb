import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import NotebookItem from '@/apps/notebook/NotebookItem.vue';

// 固定为历史日期（UTC 正午），相对日期必然落到「具体日期」分支且跨时区稳定
const FIXED_DATE = '2025-06-01T12:00:00Z';

const baseNote = {
  id: 1,
  title: '完成审计报告',
  description: '整理覆盖率数据',
  category: '工作',
  priority: 'high',
  completed: false,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
};

describe('notebook/NotebookItem', () => {
  it('renders title, category, description and relative date', () => {
    const { getByText } = render(NotebookItem, {
      props: { note: baseNote },
    });

    expect(getByText('完成审计报告')).toBeInTheDocument();
    expect(getByText('工作')).toBeInTheDocument();
    expect(getByText('整理覆盖率数据')).toBeInTheDocument();
    expect(getByText('高')).toBeInTheDocument();

    const dateEl = getByText('6月1日');
    // title 提示展示完整本地时间串
    expect(dateEl.title).toMatch(/^2025\/6\/1/);
  });

  it.each([
    ['low', '低'],
    ['medium', '中'],
    ['high', '高'],
    ['unknown-level', '中'],
  ])('maps priority %s to text %s', (priority, text) => {
    const { getByText } = render(NotebookItem, {
      props: { note: { ...baseNote, priority } },
    });

    expect(getByText(text)).toBeInTheDocument();
  });

  it('marks completed notes with aria state and styles', () => {
    const { getByRole } = render(NotebookItem, {
      props: { note: { ...baseNote, completed: true } },
    });

    const statusBtn = getByRole('button', { name: '标记为待办' });
    expect(statusBtn).toHaveAttribute('aria-pressed', 'true');
    expect(statusBtn).toHaveClass('completed');
  });

  it('hides description, category and date in compact view', () => {
    const { queryByText, queryByTitle } = render(NotebookItem, {
      props: { note: baseNote, compactView: true },
    });

    expect(queryByText('整理覆盖率数据')).toBeNull();
    expect(queryByText('工作')).toBeNull();
    expect(queryByTitle('6月1日')).toBeNull();
  });

  it('emits toggleStatus, edit and delete from action buttons', async () => {
    const { getByRole, emitted } = render(NotebookItem, {
      props: { note: baseNote },
    });

    await fireEvent.click(getByRole('button', { name: '标记为已完成' }));
    await fireEvent.click(getByRole('button', { name: '编辑' }));
    await fireEvent.click(getByRole('button', { name: '删除' }));

    expect(emitted().toggleStatus).toHaveLength(1);
    expect(emitted().edit).toHaveLength(1);
    expect(emitted().delete).toHaveLength(1);
  });

  it('renders an empty date cell for notes without timestamps', () => {
    const note = { ...baseNote, createdAt: '', updatedAt: '' };
    const { container } = render(NotebookItem, { props: { note } });

    const dateEl = container.querySelector('.note-date');
    expect(dateEl).toBeInTheDocument();
    expect(dateEl.title).toBe('');
  });
});
