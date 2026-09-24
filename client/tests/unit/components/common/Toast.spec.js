import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/vue';
import Toast from '@/components/common/Toast.vue';

describe('common/Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the message with the type class while visible', () => {
    const { getByRole } = render(Toast, {
      props: { modelValue: true, message: '保存成功', type: 'success' },
    });

    const toast = getByRole('status');
    expect(toast).toHaveTextContent('保存成功');
    expect(toast).toHaveClass('toast-success');
  });

  it('renders nothing when hidden', () => {
    const { container, queryByRole } = render(Toast, {
      props: { modelValue: false, message: '隐藏中' },
    });

    expect(queryByRole('status')).toBeNull();
    expect(container.querySelector('.toast')).toBeNull();
  });

  it('auto-hides after the duration and notifies the parent', async () => {
    const { emitted, queryByRole } = render(Toast, {
      props: { modelValue: true, message: '稍后消失', duration: 2000 },
    });

    vi.advanceTimersByTime(1999);
    expect(queryByRole('status')).not.toBeNull();

    vi.advanceTimersByTime(1);

    expect(emitted()['update:modelValue'].at(-1)[0]).toBe(false);
    expect(emitted().close).toHaveLength(1);
  });

  it('uses the error type class for error toasts', () => {
    const { getByRole } = render(Toast, {
      props: { modelValue: true, message: '失败', type: 'error' },
    });

    expect(getByRole('status')).toHaveClass('toast-error');
  });

  it('resets the timer when the message changes while visible', async () => {
    const { rerender, emitted, queryByRole } = render(Toast, {
      props: { modelValue: true, message: '第一条', duration: 2000 },
    });

    vi.advanceTimersByTime(1000);
    await rerender({ message: '第二条' });

    vi.advanceTimersByTime(1500);
    expect(queryByRole('status')).not.toBeNull();
    expect(emitted().close).toBeFalsy();

    vi.advanceTimersByTime(500);
    expect(emitted().close).toHaveLength(1);
  });

  it('clears the pending timer when hidden externally', async () => {
    const { rerender, emitted } = render(Toast, {
      props: { modelValue: true, message: '会被关闭', duration: 1000 },
    });

    await rerender({ modelValue: false });
    vi.advanceTimersByTime(5000);

    expect(emitted().close).toBeFalsy();
  });

  it('reflects external visibility changes', async () => {
    const { rerender, queryByRole } = render(Toast, {
      props: { modelValue: false, message: '后出现' },
    });

    await rerender({ modelValue: true });
    expect(queryByRole('status')).toHaveTextContent('后出现');
  });
});
