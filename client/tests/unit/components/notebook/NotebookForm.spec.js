import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import NotebookForm from '@/apps/notebook/NotebookForm.vue';

const editingNote = {
  id: 7,
  title: '原标题',
  description: '原描述',
  category: '工作',
  priority: 'high',
  completed: false,
};

describe('notebook/NotebookForm', () => {
  it('renders create mode with empty fields', () => {
    const { getByLabelText, getByRole } = render(NotebookForm);

    expect(getByLabelText('标题 *').value).toBe('');
    expect(getByRole('button', { name: '创建' })).toBeInTheDocument();
  });

  it('disables submit until a title is entered', async () => {
    const { getByLabelText, getByRole, emitted } = render(NotebookForm);
    const submitButton = getByRole('button', { name: '创建' });

    expect(submitButton).toBeDisabled();
    await fireEvent.update(getByLabelText('标题 *'), '新笔记');
    expect(submitButton).toBeEnabled();
    expect(emitted().save).toBeFalsy();
  });

  it('emits trimmed payload and resets fields after creating', async () => {
    const { getByLabelText, getByRole, emitted } = render(NotebookForm, {
      props: { categories: ['工作', '生活'] },
    });

    await fireEvent.update(getByLabelText('标题 *'), '  带空格标题  ');
    await fireEvent.update(getByLabelText('描述'), '  描述内容  ');
    await fireEvent.update(getByLabelText('分类'), '工作');
    await fireEvent.update(getByLabelText('优先级'), 'high');
    await fireEvent.click(getByRole('button', { name: '创建' }));

    expect(emitted().save[0][0]).toEqual({
      title: '带空格标题',
      description: '描述内容',
      category: '工作',
      priority: 'high',
    });
    expect(getByLabelText('标题 *').value).toBe('');
    expect(getByLabelText('描述').value).toBe('');
    expect(getByLabelText('分类').value).toBe('');
    expect(getByLabelText('优先级').value).toBe('medium');
  });

  it('does not emit save when submit is forced without a title', async () => {
    const { container, emitted } = render(NotebookForm);

    await fireEvent.submit(container.querySelector('form'));

    expect(emitted().save).toBeFalsy();
  });

  it('prefills fields in edit mode and keeps values after saving', async () => {
    const { getByLabelText, getByRole, getByText, emitted } = render(
      NotebookForm,
      { props: { note: editingNote } }
    );

    expect(getByText('编辑笔记')).toBeInTheDocument();
    expect(getByLabelText('标题 *').value).toBe('原标题');
    expect(getByLabelText('描述').value).toBe('原描述');
    expect(getByLabelText('分类').value).toBe('工作');
    expect(getByLabelText('优先级').value).toBe('high');

    await fireEvent.update(getByLabelText('标题 *'), '改后的标题');
    await fireEvent.click(getByRole('button', { name: '更新' }));

    expect(emitted().save[0][0]).toMatchObject({
      title: '改后的标题',
      category: '工作',
    });
    expect(getByLabelText('标题 *').value).toBe('改后的标题');
  });

  it('resets the form when the note prop switches back to null', async () => {
    const { rerender, getByLabelText } = render(NotebookForm, {
      props: { note: editingNote },
    });

    await rerender({ note: null });

    expect(getByLabelText('标题 *').value).toBe('');
    expect(getByLabelText('优先级').value).toBe('medium');
  });

  it('emits cancel from the cancel button', async () => {
    const { getByRole, emitted } = render(NotebookForm);

    await fireEvent.click(getByRole('button', { name: '取消' }));
    expect(emitted().cancel).toHaveLength(1);
  });

  it('offers known categories as datalist options', () => {
    const { container } = render(NotebookForm, {
      props: { categories: ['工作', '生活'] },
    });

    const options = container.querySelectorAll(
      '#notebook-category-options option'
    );
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('工作');
    expect(options[1].value).toBe('生活');
  });
});
