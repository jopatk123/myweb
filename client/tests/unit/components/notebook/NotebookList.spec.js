import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import NotebookList from '@/apps/notebook/NotebookList.vue';

const notes = [
  { id: 1, title: '第一条', completed: false, priority: 'medium' },
  { id: 2, title: '第二条', completed: true, priority: 'low' },
];

describe('notebook/NotebookList', () => {
  it('renders one item per note', () => {
    const { getByText } = render(NotebookList, { props: { notes } });

    expect(getByText('第一条')).toBeInTheDocument();
    expect(getByText('第二条')).toBeInTheDocument();
  });

  it('forwards item events with the matching note payload', async () => {
    const { getAllByRole, emitted } = render(NotebookList, {
      props: { notes },
    });

    const statusButtons = getAllByRole('button', {
      name: /标记为(已完成|待办)/,
    });
    await fireEvent.click(statusButtons[1]);
    const editButtons = getAllByRole('button', { name: '编辑' });
    await fireEvent.click(editButtons[0]);
    const deleteButtons = getAllByRole('button', { name: '删除' });
    await fireEvent.click(deleteButtons[1]);

    expect(emitted().toggleStatus[0]).toEqual([2]);
    expect(emitted().edit[0]).toEqual([notes[0]]);
    expect(emitted().delete[0]).toEqual([notes[1]]);
  });

  it('renders nothing extra for an empty list', () => {
    const { container } = render(NotebookList, { props: { notes: [] } });

    expect(container.querySelectorAll('.notebook-item')).toHaveLength(0);
  });
});
