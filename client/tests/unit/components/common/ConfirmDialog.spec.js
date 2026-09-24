import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

describe('common/ConfirmDialog', () => {
  it('renders nothing while hidden', () => {
    const { container } = render(ConfirmDialog, {
      props: { modelValue: false },
    });
    expect(container.querySelector('.backdrop')).toBeNull();
  });

  it('renders the default title and message', () => {
    const { getByText, getByRole } = render(ConfirmDialog, {
      props: { modelValue: true },
    });

    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText('确认操作')).toBeInTheDocument();
    expect(getByText('是否继续？')).toBeInTheDocument();
  });

  it('closes via cancel button or overlay self click', async () => {
    const { getByRole, container, emitted } = render(ConfirmDialog, {
      props: { modelValue: true, title: '删除分组' },
    });

    await fireEvent.click(getByRole('button', { name: '取消' }));
    expect(emitted()['update:modelValue'][0][0]).toBe(false);

    await fireEvent.click(container.querySelector('.backdrop'));
    expect(emitted()['update:modelValue'][1][0]).toBe(false);
  });

  it('emits confirm and closes from the danger button', async () => {
    const { getByRole, emitted } = render(ConfirmDialog, {
      props: { modelValue: true, title: '删除分组' },
    });

    await fireEvent.click(getByRole('button', { name: '确认' }));

    expect(emitted().confirm).toHaveLength(1);
    expect(emitted()['update:modelValue'][0][0]).toBe(false);
  });

  it('does not close when clicking inside the dialog body', async () => {
    const { container, emitted } = render(ConfirmDialog, {
      props: { modelValue: true },
    });

    await fireEvent.click(container.querySelector('.dialog'));

    expect(emitted()['update:modelValue']).toBeFalsy();
  });
});
