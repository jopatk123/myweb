import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import QuickAddNote from '@/apps/notebook/QuickAddNote.vue';

function renderQuickAdd(onQuickAdd) {
  return render(QuickAddNote, { props: { onQuickAdd } });
}

describe('notebook/QuickAddNote', () => {
  it('renders the quick add input', () => {
    const { getByPlaceholderText } = renderQuickAdd(vi.fn());

    expect(getByPlaceholderText(/快速添加/)).toBeInTheDocument();
  });

  it('hides the submit button while empty and unfocused', () => {
    const { queryByRole } = renderQuickAdd(vi.fn());

    expect(queryByRole('button', { name: '添加' })).toBeNull();
  });

  it('shows a disabled button on focus when the input is empty', async () => {
    const { getByPlaceholderText, getByRole } = renderQuickAdd(vi.fn());

    await fireEvent.focus(getByPlaceholderText(/快速添加/));
    expect(getByRole('button', { name: '添加' })).toBeDisabled();
  });

  it('adds a note on Enter and clears the input on success', async () => {
    const onQuickAdd = vi.fn().mockResolvedValue(true);
    const { getByPlaceholderText } = renderQuickAdd(onQuickAdd);
    const input = getByPlaceholderText(/快速添加/);

    await fireEvent.update(input, '  买牛奶  ');
    await fireEvent.keyUp(input, { key: 'Enter' });

    expect(onQuickAdd).toHaveBeenCalledWith('买牛奶');
    await vi.waitFor(() => expect(input.value).toBe(''));
  });

  it('keeps the text when onQuickAdd reports rejection', async () => {
    const onQuickAdd = vi.fn().mockResolvedValue(false);
    const { getByPlaceholderText } = renderQuickAdd(onQuickAdd);
    const input = getByPlaceholderText(/快速添加/);

    await fireEvent.update(input, '被拒绝的笔记');
    await fireEvent.keyUp(input, { key: 'Enter' });

    await vi.waitFor(() => expect(input.value).toBe('被拒绝的笔记'));
  });

  it('ignores Enter while a previous add is still pending', async () => {
    let resolveAdd;
    const onQuickAdd = vi
      .fn()
      .mockImplementation(() => new Promise(resolve => (resolveAdd = resolve)));
    const { getByPlaceholderText } = renderQuickAdd(onQuickAdd);
    const input = getByPlaceholderText(/快速添加/);

    await fireEvent.update(input, '第一条');
    await fireEvent.keyUp(input, { key: 'Enter' });
    await fireEvent.keyUp(input, { key: 'Enter' });

    expect(onQuickAdd).toHaveBeenCalledTimes(1);
    resolveAdd(true);
    await vi.waitFor(() => expect(input.value).toBe(''));
  });

  it('does nothing on Enter with whitespace-only text', async () => {
    const onQuickAdd = vi.fn().mockResolvedValue(true);
    const { getByPlaceholderText } = renderQuickAdd(onQuickAdd);
    const input = getByPlaceholderText(/快速添加/);

    await fireEvent.update(input, '   ');
    await fireEvent.keyUp(input, { key: 'Enter' });

    expect(onQuickAdd).not.toHaveBeenCalled();
  });
});
