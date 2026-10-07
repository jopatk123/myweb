import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import NotebookEmptyState from '@/apps/notebook/NotebookEmptyState.vue';

describe('notebook/NotebookEmptyState', () => {
  it('prompts to create the first note when there are no notes', async () => {
    const { getByText, getByRole, emitted } = render(NotebookEmptyState, {
      props: { hasNotes: false, hasFilters: false, searchQuery: '' },
    });

    expect(getByText('还没有笔记')).toBeInTheDocument();
    await fireEvent.click(getByRole('button', { name: '新建笔记' }));
    expect(emitted().addNote).toHaveLength(1);
  });

  it('offers to clear filters when filtered notes exist', async () => {
    const { getByText, getByRole, emitted, queryByRole } = render(
      NotebookEmptyState,
      {
        props: { hasNotes: true, hasFilters: true, searchQuery: '' },
      }
    );

    expect(getByText('没有找到匹配的笔记')).toBeInTheDocument();
    expect(queryByRole('button', { name: '新建笔记' })).toBeNull();
    await fireEvent.click(getByRole('button', { name: '清除筛选条件' }));
    expect(emitted().clearFilters).toHaveLength(1);
  });

  it('shows the no-match title for search-only misses without action buttons', () => {
    const { getByText, queryByRole } = render(NotebookEmptyState, {
      props: { hasNotes: true, hasFilters: false, searchQuery: '报告' },
    });

    expect(getByText('没有找到匹配的笔记')).toBeInTheDocument();
    expect(queryByRole('button')).toBeNull();
  });

  it('uses the generic title when notes exist but no filter matches', () => {
    const { getByText, queryByRole } = render(NotebookEmptyState, {
      props: { hasNotes: true, hasFilters: false, searchQuery: '' },
    });

    expect(getByText('没有符合条件的笔记')).toBeInTheDocument();
    expect(queryByRole('button')).toBeNull();
  });
});
