import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import ConfirmDialog from '@/components/message-board/ConfirmDialog.vue';

describe('ConfirmDialog', () => {
  it('renders nothing while hidden', () => {
    const { container } = render(ConfirmDialog, { props: { visible: false } });
    expect(container.querySelector('.confirm-dialog-overlay')).toBeNull();
  });

  it('renders title, custom lines and button labels when visible', () => {
    const { getByRole, getByText } = render(ConfirmDialog, {
      props: {
        visible: true,
        title: '⚠️ 确认清除留言板',
        lines: ['第一行', '第二行'],
        confirmText: '确认清除',
        cancelText: '再想想',
      },
    });

    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText('第一行')).toBeInTheDocument();
    expect(getByText('第二行')).toBeInTheDocument();
    expect(getByRole('button', { name: '确认清除' })).toBeInTheDocument();
    expect(getByRole('button', { name: '再想想' })).toBeInTheDocument();
  });

  it('falls back to a default line when no lines are provided', () => {
    const { getByText } = render(ConfirmDialog, {
      props: { visible: true },
    });
    expect(getByText('确定要继续吗？')).toBeInTheDocument();
  });

  it('emits confirm / cancel from the action buttons', async () => {
    const { getByRole, emitted } = render(ConfirmDialog, {
      props: { visible: true, confirmText: '确认', cancelText: '取消' },
    });

    await fireEvent.click(getByRole('button', { name: '确认' }));
    await fireEvent.click(getByRole('button', { name: '取消' }));

    expect(emitted().confirm).toHaveLength(1);
    expect(emitted().cancel).toHaveLength(1);
  });

  it('cancels when clicking the overlay but not the dialog body', async () => {
    const { container, emitted } = render(ConfirmDialog, {
      props: { visible: true },
    });

    await fireEvent.click(container.querySelector('.confirm-dialog-overlay'));
    expect(emitted().cancel).toHaveLength(1);

    await fireEvent.click(container.querySelector('.confirm-dialog'));
    expect(emitted().cancel).toHaveLength(1);
  });

  it('cancels on Escape while visible and detaches the listener when hidden', async () => {
    const { rerender, emitted, container } = render(ConfirmDialog, {
      props: { visible: true },
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(emitted().cancel).toHaveLength(1);

    await rerender({ visible: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(emitted().cancel).toHaveLength(1);
    expect(container.querySelector('.confirm-dialog-overlay')).toBeNull();
  });
});
