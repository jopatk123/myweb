import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive } from 'vue';
import { render, fireEvent } from '@testing-library/vue';
import GlobalToastHost from '@/components/common/GlobalToastHost.vue';

const toastHost = vi.hoisted(() => ({ current: null }));

vi.mock('@/composables/useGlobalToast.js', async () => {
  const state = {
    toastState: reactive({
      visible: false,
      message: '',
      type: 'info',
      duration: 2200,
      key: 0,
    }),
    hideToast: vi.fn(() => {
      state.toastState.visible = false;
    }),
  };
  toastHost.current = state;
  return { useGlobalToast: () => state };
});

vi.mock('@/components/common/Toast.vue', () => ({
  default: {
    name: 'ToastStub',
    props: ['modelValue', 'message', 'type', 'duration'],
    emits: ['update:modelValue', 'close'],
    template: `<div v-if="modelValue" class="toast-stub"
      @click="$emit('update:modelValue', false)"
      @dblclick="$emit('update:modelValue', true)">{{ message }}</div>`,
  },
}));

describe('common/GlobalToastHost', () => {
  beforeEach(() => {
    Object.assign(toastHost.current.toastState, {
      visible: false,
      message: '',
      type: 'info',
      duration: 2200,
      key: 0,
    });
    toastHost.current.hideToast.mockClear();
  });

  it('passes the shared toast state to the Toast instance', async () => {
    const { container } = render(GlobalToastHost);
    expect(container.querySelector('.toast-stub')).toBeNull();

    const state = toastHost.current.toastState;
    state.key = 1;
    state.message = '已保存';
    state.type = 'success';
    state.duration = 1200;
    state.visible = true;
    await Promise.resolve();

    const stub = container.querySelector('.toast-stub');
    expect(stub).not.toBeNull();
    expect(stub).toHaveTextContent('已保存');
  });

  it('relays the close request to hideToast', async () => {
    toastHost.current.toastState.visible = true;
    toastHost.current.toastState.message = '点击关闭';
    const { container } = render(GlobalToastHost);
    await Promise.resolve();

    await fireEvent.click(container.querySelector('.toast-stub'));

    expect(toastHost.current.hideToast).toHaveBeenCalledTimes(1);
    expect(toastHost.current.toastState.visible).toBe(false);
  });

  it('never calls hideToast for truthy visibility updates', async () => {
    toastHost.current.toastState.visible = true;
    toastHost.current.toastState.message = '双击不关闭';
    const { container } = render(GlobalToastHost);
    await Promise.resolve();

    await fireEvent.dblClick(container.querySelector('.toast-stub'));

    expect(toastHost.current.hideToast).not.toHaveBeenCalled();
  });
});
