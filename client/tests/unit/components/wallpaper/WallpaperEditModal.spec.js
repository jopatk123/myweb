import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import WallpaperEditModal from '@/components/wallpaper/WallpaperEditModal.vue';

const updateWallpaperMock = vi.hoisted(() => vi.fn());

vi.mock('@/composables/useWallpaper.js', () => ({
  useWallpaper: () => ({
    updateWallpaper: updateWallpaperMock,
  }),
}));

vi.mock('@/composables/useDraggableModal.js', () => ({
  useDraggableModal: () => ({
    modalRef: ref(null),
    modalStyle: {},
    onHeaderPointerDown: vi.fn(),
  }),
}));

const mountModal = wallpaper =>
  mount(WallpaperEditModal, { props: { wallpaper } });

const getInput = wrapper => wrapper.find('input[type="text"]');
const getSaveButton = wrapper => wrapper.find('.btn-primary');

beforeEach(() => {
  updateWallpaperMock.mockReset();
});

describe('WallpaperEditModal', () => {
  it('initialises the name with the documented field fallbacks', () => {
    expect(getInput(mountModal({ id: 1, name: 'A' })).element.value).toBe('A');
    expect(
      getInput(mountModal({ id: 1, originalName: 'B.png' })).element.value
    ).toBe('B.png');
    expect(
      getInput(mountModal({ id: 1, original_name: 'C.png' })).element.value
    ).toBe('C.png');
    expect(getInput(mountModal({ id: 1 })).element.value).toBe('');
  });

  it('re-syncs the local name when the wallpaper prop is replaced', async () => {
    const wrapper = mountModal({ id: 1, name: 'old' });

    await wrapper.setProps({ wallpaper: { id: 1, name: 'renamed' } });

    expect(getInput(wrapper).element.value).toBe('renamed');
  });

  it('blocks saving when the trimmed name is empty', async () => {
    const wrapper = mountModal({ id: 7, name: '   ' });

    await getSaveButton(wrapper).trigger('click');

    expect(wrapper.find('.error-message').text()).toBe('名称不能为空');
    expect(updateWallpaperMock).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toBeUndefined();
  });

  it('trims the name and emits saved after a successful update', async () => {
    updateWallpaperMock.mockResolvedValue({ data: { id: 7 } });
    const wrapper = mountModal({ id: 7, name: '  fancy  ' });

    await getInput(wrapper).setValue('  new name  ');
    await getSaveButton(wrapper).trigger('click');
    await flushPromises();

    expect(updateWallpaperMock).toHaveBeenCalledTimes(1);
    expect(updateWallpaperMock).toHaveBeenCalledWith(7, { name: 'new name' });
    expect(wrapper.emitted('saved')).toHaveLength(1);
    expect(wrapper.find('.error-message').exists()).toBe(false);
  });

  it('shows the backend error message when saving fails', async () => {
    updateWallpaperMock.mockRejectedValue(new Error('名称重复'));
    const wrapper = mountModal({ id: 7, name: 'x' });

    await getSaveButton(wrapper).trigger('click');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toBe('名称重复');
    expect(wrapper.emitted('saved')).toBeUndefined();
  });

  it('falls back to a generic message when the error carries none', async () => {
    updateWallpaperMock.mockRejectedValue({});
    const wrapper = mountModal({ id: 7, name: 'x' });

    await getSaveButton(wrapper).trigger('click');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toBe('保存失败');
  });

  it('disables the save button while a save is in flight', async () => {
    let resolveSave;
    updateWallpaperMock.mockImplementation(
      () => new Promise(resolve => (resolveSave = resolve))
    );
    const wrapper = mountModal({ id: 7, name: 'x' });

    await getSaveButton(wrapper).trigger('click');

    expect(getSaveButton(wrapper).attributes('disabled')).toBeDefined();
    expect(getSaveButton(wrapper).text()).toBe('保存中...');

    resolveSave();
    await flushPromises();
    expect(wrapper.emitted('saved')).toHaveLength(1);
  });

  it('emits close from the overlay but not from clicks inside the dialog', async () => {
    const wrapper = mountModal({ id: 7, name: 'x' });

    await wrapper.find('.modal-content').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();

    await wrapper.find('.modal-overlay').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    await wrapper.find('.close-btn').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);

    await wrapper.find('.btn-secondary').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(3);
  });
});
