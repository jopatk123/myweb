import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import WallpaperSidebar from '@/components/wallpaper/WallpaperSidebar.vue';

const groups = [
  { id: 'g1', name: '风景' },
  { id: 'g2', name: '默认组', is_default: true, is_current: true },
];

const mountSidebar = selectedGroupId =>
  mount(WallpaperSidebar, { props: { groups, selectedGroupId } });

const getCreateButton = wrapper => wrapper.find('.btn-secondary.btn-sm');
const getDeleteButton = wrapper => wrapper.find('.btn-danger');
const getApplyButton = wrapper => wrapper.find('.btn-primary');
const getGroupItems = wrapper => wrapper.findAll('.group-item');

describe('WallpaperSidebar', () => {
  it('disables delete when nothing is selected', () => {
    const wrapper = mountSidebar('');

    expect(getDeleteButton(wrapper).attributes('disabled')).toBeDefined();
    expect(getApplyButton(wrapper).attributes('disabled')).toBeDefined();
  });

  it('disables delete for the default group but keeps apply available', () => {
    const wrapper = mountSidebar('g2');

    expect(getDeleteButton(wrapper).attributes('disabled')).toBeDefined();
    expect(getApplyButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('enables delete and apply for a regular selected group', () => {
    const wrapper = mountSidebar('g1');

    expect(getDeleteButton(wrapper).attributes('disabled')).toBeUndefined();
    expect(getApplyButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('always allows opening the create-group dialog', async () => {
    const wrapper = mountSidebar('');

    await getCreateButton(wrapper).trigger('click');

    expect(wrapper.emitted('create-group')).toHaveLength(1);
  });

  it('emits select-group with the group id or an empty string for all', async () => {
    const wrapper = mountSidebar('');

    await getGroupItems(wrapper)[0].trigger('click');
    await getGroupItems(wrapper)[1].trigger('click');
    await getGroupItems(wrapper)[2].trigger('click');

    expect(wrapper.emitted('select-group')).toEqual([[''], ['g1'], ['g2']]);
  });

  it('emits apply-current with the selected group id', async () => {
    const wrapper = mountSidebar('g1');

    await getApplyButton(wrapper).trigger('click');

    expect(wrapper.emitted('apply-current')).toEqual([['g1']]);
  });

  it('marks the current-applying group with a badge', () => {
    const wrapper = mountSidebar('');

    const items = getGroupItems(wrapper);
    expect(items[0].text()).not.toContain('（当前应用壁纸）');
    expect(items[2].text()).toContain('（当前应用壁纸）');
  });

  it('highlights the selected group item', () => {
    const wrapper = mountSidebar('g1');

    const items = getGroupItems(wrapper);
    // 选中具体分组时「全部壁纸」不再高亮
    expect(items[0].classes()).not.toContain('active');
    expect(items[1].classes()).toContain('active');
    expect(items[2].classes()).not.toContain('active');
  });
});
