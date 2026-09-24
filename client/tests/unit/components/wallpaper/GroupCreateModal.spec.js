import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import GroupCreateModal from '@/components/wallpaper/GroupCreateModal.vue';

const createGroupMock = vi.hoisted(() => vi.fn());

vi.mock('@/composables/useWallpaper.js', () => ({
  useWallpaper: () => ({
    createGroup: createGroupMock,
  }),
}));

vi.mock('@/composables/useDraggableModal.js', () => ({
  useDraggableModal: () => ({
    modalRef: ref(null),
    modalStyle: {},
    onHeaderPointerDown: vi.fn(),
  }),
}));

const getNameInput = wrapper => wrapper.find('#groupName');
const getSubmitButton = wrapper => wrapper.find('button[type="submit"]');

beforeEach(() => {
  createGroupMock.mockReset();
});

describe('GroupCreateModal', () => {
  it('keeps submit disabled until the name has non-whitespace content', async () => {
    const wrapper = mount(GroupCreateModal);
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();

    await getNameInput(wrapper).setValue('   ');
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();

    await getNameInput(wrapper).setValue('旅行');
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('creates with the trimmed name and emits created', async () => {
    createGroupMock.mockResolvedValue({ data: { id: 3 } });
    const wrapper = mount(GroupCreateModal);

    await getNameInput(wrapper).setValue('  旅行  ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createGroupMock).toHaveBeenCalledTimes(1);
    expect(createGroupMock).toHaveBeenCalledWith({ name: '旅行' });
    expect(wrapper.emitted('created')).toHaveLength(1);
    expect(getSubmitButton(wrapper).text()).toBe('创建');
  });

  it('does not call the api when the name is blank even if submit is forced', async () => {
    const wrapper = mount(GroupCreateModal);

    await getNameInput(wrapper).setValue('   ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createGroupMock).not.toHaveBeenCalled();
    expect(wrapper.emitted('created')).toBeUndefined();
  });

  it('shows the backend error message when creation fails', async () => {
    createGroupMock.mockRejectedValue(new Error('分组已存在'));
    const wrapper = mount(GroupCreateModal);

    await getNameInput(wrapper).setValue('旅行');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toBe('分组已存在');
    expect(wrapper.emitted('created')).toBeUndefined();
  });

  it('falls back to a generic message when the error carries none', async () => {
    createGroupMock.mockRejectedValue({});
    const wrapper = mount(GroupCreateModal);

    await getNameInput(wrapper).setValue('旅行');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toBe('创建失败');
  });

  it('shows progress and disables submit while creating', async () => {
    let resolveCreate;
    createGroupMock.mockImplementation(
      () => new Promise(resolve => (resolveCreate = resolve))
    );
    const wrapper = mount(GroupCreateModal);

    await getNameInput(wrapper).setValue('旅行');
    await wrapper.find('form').trigger('submit');

    expect(getSubmitButton(wrapper).text()).toBe('创建中...');
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();

    resolveCreate();
    await flushPromises();
    expect(wrapper.emitted('created')).toHaveLength(1);
  });

  it('emits close from overlay, close button and cancel button', async () => {
    const wrapper = mount(GroupCreateModal);

    await wrapper.find('.modal-content').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();

    await wrapper.find('.modal-overlay').trigger('click');
    await wrapper.find('.close-btn').trigger('click');
    await wrapper.find('.btn-secondary').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(3);
  });
});
