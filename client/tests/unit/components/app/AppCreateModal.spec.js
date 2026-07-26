import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import AppCreateModal from '@/components/app/AppCreateModal.vue';

// Mock apiFetch：上传接口返回固定 filename（用 hoisted 占位避免引用外部变量）
const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/api/httpClient.js', () => ({
  apiFetch: (...args) => apiFetchMock(...args),
}));

// Mock 全局 toast
const showErrorMock = vi.hoisted(() => vi.fn());
const showInfoMock = vi.hoisted(() => vi.fn());
vi.mock('@/composables/useGlobalToast.js', () => ({
  useGlobalToast: () => ({
    showError: (...args) => showErrorMock(...args),
    showInfo: (...args) => showInfoMock(...args),
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
  }),
}));

// Stub IconSelector：用一个最小可挂载组件，便于通过 vm.$emit 触发事件
const IconSelectorStub = vi.hoisted(() => ({
  name: 'IconSelector',
  props: ['modelValue', 'iconFilename'],
  emits: ['update:modelValue', 'update:iconFilename', 'select-file'],
  template: '<div class="icon-selector-stub"></div>',
}));

vi.mock('@/components/app/IconSelector.vue', () => ({
  default: IconSelectorStub,
}));

describe('AppCreateModal - B1 regression: preset icon should not be overridden by stale pendingFile', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    showErrorMock.mockReset();
    showInfoMock.mockReset();
  });

  it('uses preset icon (not stale uploaded file) when user switches from upload to preset before submit', async () => {
    const wrapper = mount(AppCreateModal, {
      props: { show: true, groupId: null },
    });

    // 填写名称和 URL
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('MyApp');
    await inputs[1].setValue('https://example.com');

    // 模拟用户在 IconSelector 中先选择了一个本地文件 → 触发 select-file(file)
    const stub = wrapper.findComponent({ name: 'IconSelector' });
    stub.vm.$emit(
      'select-file',
      new File(['x'], 'upload.png', { type: 'image/png' })
    );
    await nextTick();

    // 然后用户切回预设图标：IconSelector 会触发 update:modelValue(presetPath)
    // + update:iconFilename(null) + select-file(null) 清空 pendingFile
    stub.vm.$emit('update:modelValue', '/apps/icons/browser.svg');
    stub.vm.$emit('update:iconFilename', null);
    stub.vm.$emit('select-file', null);
    await nextTick();

    // 点击创建
    const buttons = wrapper.findAll('button');
    const submitBtn = buttons.find(b => b.text().trim() === '创建');
    await submitBtn.trigger('click');
    await nextTick();

    // 关键断言：upload 接口不应被调用（pendingFile 已被清空）
    expect(apiFetchMock).not.toHaveBeenCalled();

    // submit payload 应包含 presetIcon，且 iconFilename 为 null
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect(submitEvents.length).toBeGreaterThan(0);
    const [payload] = submitEvents[0];
    expect(payload.presetIcon).toBe('browser.svg');
    expect(payload.iconFilename).toBeNull();
  });

  it('uploads file when user picks a local file and does not switch to preset', async () => {
    const wrapper = mount(AppCreateModal, {
      props: { show: true, groupId: null },
    });

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('MyApp2');
    await inputs[1].setValue('https://example.com');

    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: { filename: 'uploaded-uuid.png' },
      }),
    });

    const stub = wrapper.findComponent({ name: 'IconSelector' });
    stub.vm.$emit(
      'select-file',
      new File(['x'], 'upload.png', { type: 'image/png' })
    );
    await nextTick();

    const buttons = wrapper.findAll('button');
    const submitBtn = buttons.find(b => b.text().trim() === '创建');
    await submitBtn.trigger('click');
    await nextTick();
    await nextTick();

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    const [payload] = submitEvents[0];
    expect(payload.iconFilename).toBe('uploaded-uuid.png');
    expect(payload.presetIcon).toBeUndefined();
  });
});
