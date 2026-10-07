import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import NotebookToolbar from '@/apps/notebook/NotebookToolbar.vue';

const baseProps = {
  search: '',
  filter: 'all',
  category: 'all',
  filterPriority: 'all',
  sortBy: 'updated',
  categories: ['工作', '生活'],
  compactView: false,
  completedCount: 0,
};

function renderToolbar(extraProps = {}) {
  return render(NotebookToolbar, { props: { ...baseProps, ...extraProps } });
}

describe('notebook/NotebookToolbar', () => {
  it('renders the search input and category options', () => {
    const { getByLabelText, getByRole } = renderToolbar();

    expect(getByLabelText('搜索笔记')).toBeInTheDocument();
    const categorySelect = getByRole('combobox', { name: '按分类筛选' });
    // 「全部分类」+ categories prop 中的两个已知分类
    expect(categorySelect.options).toHaveLength(3);
    expect(categorySelect.options[1].value).toBe('工作');
  });

  it.each([
    ['搜索笔记', '覆盖关键词', 'update:search'],
    ['按状态筛选', 'completed', 'update:filter'],
    ['按分类筛选', '生活', 'update:category'],
    ['按优先级筛选', 'low', 'update:filterPriority'],
    ['排序方式', 'title', 'update:sortBy'],
  ])('emits %s changes as %s', async (label, value, event) => {
    const { getByLabelText, emitted } = renderToolbar();
    const control = getByLabelText(label);

    if (control.tagName === 'SELECT') {
      control.value = value;
      await fireEvent.change(control);
    } else {
      await fireEvent.update(control, value);
    }

    expect(emitted()[event].at(-1)).toEqual([value]);
  });

  it('toggles compact view and swaps the icon', async () => {
    const { getByRole, emitted, rerender } = renderToolbar();
    const toggleButton = getByRole('button', {
      name: '切换到紧凑视图',
    });

    await fireEvent.click(toggleButton);
    expect(emitted()['update:compactView'].at(-1)).toEqual([true]);

    await rerender({ compactView: true });
    expect(getByRole('button', { name: '切换到普通视图' })).toBeInTheDocument();
  });

  it('disables clear-completed without completed notes and enables with them', async () => {
    const disabled = renderToolbar({ completedCount: 0 });
    const disabledButton = disabled.getByRole('button', {
      name: '清除已完成',
    });
    expect(disabledButton).toBeDisabled();
    disabled.unmount();

    const enabled = renderToolbar({ completedCount: 2 });
    const enabledButton = enabled.getByRole('button', { name: '清除已完成' });
    expect(enabledButton).toBeEnabled();
    await fireEvent.click(enabledButton);
    expect(enabled.emitted().clearCompleted).toHaveLength(1);
  });

  it('emits addNote from the create button', async () => {
    const { getByRole, emitted } = renderToolbar();

    await fireEvent.click(getByRole('button', { name: '新建' }));
    expect(emitted().addNote).toHaveLength(1);
  });

  it('syncs the search input when the parent resets the query', async () => {
    const { getByLabelText, rerender } = renderToolbar({ search: '关键词' });

    await rerender({ search: '' });

    expect(getByLabelText('搜索笔记').value).toBe('');
  });

  it('keeps the pending local filter when only other props change', async () => {
    const { getByLabelText, rerender } = renderToolbar();
    const control = getByLabelText('按状态筛选');
    control.value = 'pending';
    await fireEvent.change(control);

    await rerender({ completedCount: 1 });

    expect(getByLabelText('按状态筛选').value).toBe('pending');
  });
});
