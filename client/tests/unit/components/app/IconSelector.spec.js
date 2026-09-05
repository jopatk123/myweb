import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import IconSelector from '@/components/app/IconSelector.vue';

const showErrorMock = vi.hoisted(() => vi.fn());
vi.mock('@/composables/useGlobalToast.js', () => ({
  useGlobalToast: () => ({
    showError: (...args) => showErrorMock(...args),
    showInfo: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
  }),
}));

describe('IconSelector', () => {
  beforeEach(() => {
    showErrorMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('rejects unsupported files and does not emit select-file', async () => {
    const wrapper = mount(IconSelector);
    await wrapper.get('button.tab:nth-child(2)').trigger('click');
    const input = wrapper.get('input[type="file"]');
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    });
    await input.trigger('change');
    expect(showErrorMock).toHaveBeenCalled();
    expect(wrapper.emitted('select-file')).toBeFalsy();
  });

  it('emits select-file for png', async () => {
    const wrapper = mount(IconSelector);
    await wrapper.get('button.tab:nth-child(2)').trigger('click');
    const input = wrapper.get('input[type="file"]');
    const file = new File(['x'], 'icon.png', { type: 'image/png' });
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    });
    await input.trigger('change');
    expect(wrapper.emitted('select-file')?.[0]?.[0]).toBe(file);
  });
});
