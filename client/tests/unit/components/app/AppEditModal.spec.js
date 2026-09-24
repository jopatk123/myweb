import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import AppEditModal from '@/components/app/AppEditModal.vue';

// ---- useAppIconSubmit mock（holder 模式，共享同一组 ref / fn） ----
const iconSubmit = vi.hoisted(() => ({ current: null }));

vi.mock('@/composables/useAppIconSubmit.js', async () => {
  const { ref } = await import('vue');
  const state = {
    pendingFile: ref(null),
    submitting: ref(false),
    showInfo: vi.fn(),
    showError: vi.fn(),
    validateTargetUrl: vi.fn(() => true),
    discardUnreferencedIcon: vi.fn(async () => {}),
    resolveIconFields: vi.fn(async () => ({ uploadedFilename: null })),
  };
  iconSubmit.current = state;
  return { useAppIconSubmit: () => state };
});

// ---- IconSelector 桩（可触发事件、支持 reset 调用） ----
vi.mock('@/components/app/IconSelector.vue', async () => {
  const { defineComponent } = await import('vue');
  return {
    default: defineComponent({
      name: 'IconSelectorStub',
      props: ['modelValue', 'iconFilename'],
      emits: ['update:modelValue', 'update:iconFilename', 'select-file'],
      methods: {
        reset() {
          this.$emit('update:modelValue', '');
        },
      },
      template: '<div class="icon-selector-stub" />',
    }),
  };
});

const appFixture = {
  id: 1,
  name: 'Google',
  targetUrl: 'https://google.com',
  iconFilename: 'legacy.png',
};

const mountModal = (props = {}) =>
  mount(AppEditModal, {
    props: { show: false, app: null, ...props },
    attachTo: document.body,
  });

const openWithApp = async (app = appFixture) => {
  const wrapper = mountModal();
  await wrapper.setProps({ show: true, app });
  await nextTick();
  return wrapper;
};

const setForm = async (wrapper, name, url) => {
  const inputs = wrapper.findAll('input');
  await inputs[0].setValue(name);
  await inputs[1].setValue(url);
};

const clickSubmit = async wrapper => {
  const btn = wrapper.findAll('button').find(b => b.text().trim() === '保存');
  await btn.trigger('click');
};

describe('AppEditModal', () => {
  beforeEach(() => {
    const s = iconSubmit.current;
    s.pendingFile.value = null;
    s.submitting.value = false;
    vi.clearAllMocks();
    s.validateTargetUrl.mockImplementation(() => true);
    s.resolveIconFields.mockImplementation(async () => ({
      uploadedFilename: null,
    }));
  });

  it('renders nothing while hidden', () => {
    const wrapper = mountModal();
    expect(wrapper.find('.modal-backdrop').exists()).toBe(false);
    wrapper.unmount();
  });

  it('prefills the form when opened for an app and resets when closed', async () => {
    const wrapper = await openWithApp();
    const inputs = wrapper.findAll('input');
    expect(inputs[0].element.value).toBe('Google');
    expect(inputs[1].element.value).toBe('https://google.com');

    await wrapper.setProps({ show: false });
    await nextTick();
    expect(wrapper.find('.modal-backdrop').exists()).toBe(false);
    wrapper.unmount();
  });

  it('emits update:show false on close', async () => {
    const wrapper = await openWithApp();
    await wrapper.find('button.close').trigger('click');

    expect(wrapper.emitted('update:show')[0][0]).toBe(false);
    wrapper.unmount();
  });

  it('blocks closing while a submit is in flight', async () => {
    const wrapper = await openWithApp();
    iconSubmit.current.submitting.value = true;
    await nextTick();

    await wrapper.find('button.close').trigger('click');
    expect(wrapper.emitted('update:show')).toBeFalsy();
    wrapper.unmount();
  });

  it('rejects submissions without a name', async () => {
    const wrapper = await openWithApp();
    await setForm(wrapper, '   ', 'https://example.com');
    await clickSubmit(wrapper);
    await flushPromises();

    expect(iconSubmit.current.showInfo).toHaveBeenCalledWith('请填写名称');
    expect(wrapper.emitted('submit')).toBeFalsy();
    expect(iconSubmit.current.submitting.value).toBe(false);
    wrapper.unmount();
  });

  it('skips the submit when the URL fails validation', async () => {
    iconSubmit.current.validateTargetUrl.mockReturnValue(false);
    const wrapper = await openWithApp();
    await setForm(wrapper, 'MyApp', 'not-a-url');
    await clickSubmit(wrapper);
    await flushPromises();

    expect(iconSubmit.current.validateTargetUrl).toHaveBeenCalledWith(
      'not-a-url'
    );
    expect(wrapper.emitted('submit')).toBeFalsy();
    expect(iconSubmit.current.resolveIconFields).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('trims fields and emits the resolved icon payload', async () => {
    iconSubmit.current.resolveIconFields.mockResolvedValueOnce({
      iconFilename: 'uploaded.png',
      uploadedFilename: 'uploaded.png',
    });
    const wrapper = await openWithApp();
    await setForm(wrapper, '  MyApp  ', '  https://example.com  ');
    await clickSubmit(wrapper);
    await flushPromises();

    expect(wrapper.emitted('submit')[0][0]).toEqual({
      name: 'MyApp',
      targetUrl: 'https://example.com',
      iconFilename: 'uploaded.png',
    });
    expect(iconSubmit.current.submitting.value).toBe(false);
    wrapper.unmount();
  });

  it('keeps the submitting lock until the icon upload settles', async () => {
    let resolveFields;
    iconSubmit.current.resolveIconFields.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFields = resolve;
        })
    );
    const wrapper = await openWithApp();
    await setForm(wrapper, 'MyApp', 'https://example.com');
    await clickSubmit(wrapper);
    await nextTick();

    expect(
      wrapper.findAll('button').find(b => b.text().includes('保存中'))
    ).toBeTruthy();
    expect(iconSubmit.current.submitting.value).toBe(true);

    resolveFields({ uploadedFilename: null });
    await flushPromises();
    expect(iconSubmit.current.submitting.value).toBe(false);
    wrapper.unmount();
  });

  it('rolls back and toasts when icon resolution fails', async () => {
    iconSubmit.current.resolveIconFields.mockRejectedValueOnce(
      new Error('图标上传失败')
    );
    const wrapper = await openWithApp();
    await setForm(wrapper, 'MyApp', 'https://example.com');
    await clickSubmit(wrapper);
    await flushPromises();

    expect(iconSubmit.current.discardUnreferencedIcon).toHaveBeenCalledWith(
      null
    );
    expect(iconSubmit.current.showError).toHaveBeenCalledWith('图标上传失败');
    expect(wrapper.emitted('submit')).toBeFalsy();
    expect(iconSubmit.current.submitting.value).toBe(false);
    wrapper.unmount();
  });

  it('emits preset icons without an iconFilename', async () => {
    iconSubmit.current.resolveIconFields.mockResolvedValueOnce({
      presetIcon: 'browser.svg',
      uploadedFilename: null,
    });
    const wrapper = await openWithApp();
    await setForm(wrapper, 'MyApp', 'https://example.com');
    await clickSubmit(wrapper);
    await flushPromises();

    const payload = wrapper.emitted('submit')[0][0];
    expect(payload.presetIcon).toBe('browser.svg');
    expect(payload.iconFilename).toBeUndefined();
    wrapper.unmount();
  });

  it('tracks pending local files from the icon selector', async () => {
    const wrapper = await openWithApp();
    const selector = wrapper.findComponent({ name: 'IconSelectorStub' });
    const file = new File(['x'], 'upload.png', { type: 'image/png' });

    selector.vm.$emit('select-file', file);
    await nextTick();
    expect(iconSubmit.current.pendingFile.value).toBe(file);

    selector.vm.$emit('select-file', null);
    await nextTick();
    expect(iconSubmit.current.pendingFile.value).toBeNull();
    wrapper.unmount();
  });
});
