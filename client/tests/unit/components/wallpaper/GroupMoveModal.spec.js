import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import GroupMoveModal from '@/components/wallpaper/GroupMoveModal.vue';

vi.mock('@/composables/useDraggableModal.js', () => ({
  useDraggableModal: () => ({
    modalRef: ref(null),
    modalStyle: {},
    onHeaderPointerDown: vi.fn(),
  }),
}));

const groups = [
  { id: '5', name: '风景' },
  { id: 7, name: '城市' },
];

const mountModal = (props = {}) =>
  mount(GroupMoveModal, {
    props: { count: 3, groups, loading: false, ...props },
  });

describe('GroupMoveModal', () => {
  it('renders the selection count', () => {
    const wrapper = mountModal({ count: 3 });

    expect(wrapper.text()).toContain('将 3 张壁纸移动到：');
  });

  it('defaults to moving the wallpapers out of their group (null target)', async () => {
    const wrapper = mountModal();
    const options = wrapper.findAll('option');

    // 「未分组」选项默认选中
    expect(options[0].text()).toBe('未分组');
    expect(options[0].element.selected).toBe(true);

    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')).toEqual([[null]]);
  });

  it('emits confirm with the string id of the chosen group', async () => {
    const wrapper = mountModal();

    await wrapper.find('select').setValue('5');
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')).toEqual([['5']]);
  });

  it('emits confirm with the numeric id preserved through the option binding', async () => {
    const wrapper = mountModal();

    await wrapper.find('select').setValue('7');
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')).toEqual([[7]]);
  });

  it('renders every group as an option plus the ungrouped entry', () => {
    const wrapper = mountModal();
    const options = wrapper.findAll('option');

    expect(options).toHaveLength(3);
    expect(options[0].text()).toBe('未分组');
    expect(options[1].text()).toBe('风景');
    expect(options[2].text()).toBe('城市');
  });

  it('disables confirm and shows progress while moving', () => {
    const wrapper = mountModal({ loading: true });
    const confirm = wrapper.find('.btn-primary');

    expect(confirm.text()).toBe('移动中...');
    expect(confirm.attributes('disabled')).toBeDefined();
  });

  it('emits close from overlay, close button and cancel button', async () => {
    const wrapper = mountModal();

    await wrapper.find('.modal-content').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();

    await wrapper.find('.modal-overlay').trigger('click');
    await wrapper.find('.close-btn').trigger('click');
    await wrapper.find('.btn-secondary').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(3);
  });
});
