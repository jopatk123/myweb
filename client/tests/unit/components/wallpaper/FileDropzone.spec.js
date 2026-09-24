import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FileDropzone from '@/components/wallpaper/upload/FileDropzone.vue';

const makeFile = name => new File(['content'], name, { type: 'image/png' });

const setFiles = (input, files) => {
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
};

describe('FileDropzone', () => {
  it('binds accept/multiple props onto the native input', () => {
    const wrapper = mount(FileDropzone);
    const input = wrapper.find('input[type="file"]');

    expect(input.attributes('accept')).toBe('image/*');
    expect(input.attributes('multiple')).toBeDefined();

    const single = mount(FileDropzone, {
      props: { accept: 'image/png', multiple: false },
    });
    const singleInput = single.find('input[type="file"]');
    expect(singleInput.attributes('accept')).toBe('image/png');
    expect(singleInput.attributes('multiple')).toBeUndefined();
  });

  it('opens the native picker when the display area is clicked', async () => {
    const wrapper = mount(FileDropzone);
    const input = wrapper.find('input[type="file"]');
    const clickSpy = vi
      .spyOn(input.element, 'click')
      .mockImplementation(() => {});

    await wrapper.find('.file-input-display').trigger('click');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('emits files-selected with the native file list on change', async () => {
    const wrapper = mount(FileDropzone);
    const input = wrapper.find('input[type="file"]');
    const files = [makeFile('a.png')];
    setFiles(input, files);

    await input.trigger('change');

    expect(wrapper.emitted('files-selected')).toHaveLength(1);
    expect(wrapper.emitted('files-selected')[0][0]).toBe(files);
  });

  it('ignores native change events without any file', async () => {
    const wrapper = mount(FileDropzone);
    const input = wrapper.find('input[type="file"]');
    setFiles(input, []);

    await input.trigger('change');

    expect(wrapper.emitted('files-selected')).toBeUndefined();
  });

  it('toggles the drag-over class while dragging across the zone', async () => {
    const wrapper = mount(FileDropzone);
    const display = wrapper.find('.file-input-display');

    expect(display.classes()).not.toContain('drag-over');

    await display.trigger('dragover');
    expect(display.classes()).toContain('drag-over');

    await display.trigger('dragleave');
    expect(display.classes()).not.toContain('drag-over');
  });

  it('emits files on drop and clears the drag-over state', async () => {
    const wrapper = mount(FileDropzone);
    const display = wrapper.find('.file-input-display');
    const file = makeFile('b.png');

    await display.trigger('dragover');
    await display.trigger('drop', { dataTransfer: { files: [file] } });

    expect(wrapper.emitted('files-selected')).toHaveLength(1);
    expect(wrapper.emitted('files-selected')[0][0]).toEqual([file]);
    expect(display.classes()).not.toContain('drag-over');
  });

  it('ignores drops without files but still clears the drag-over state', async () => {
    const wrapper = mount(FileDropzone);
    const display = wrapper.find('.file-input-display');

    await display.trigger('dragover');
    await display.trigger('drop', { dataTransfer: { files: [] } });

    expect(wrapper.emitted('files-selected')).toBeUndefined();
    expect(display.classes()).not.toContain('drag-over');
  });

  it('renders the default hint and honours a custom slot', () => {
    const plain = mount(FileDropzone);
    expect(plain.text()).toContain('点击选择文件或拖拽到此处');

    const custom = mount(FileDropzone, {
      slots: { default: '<span class="custom-hint">拖我</span>' },
    });
    expect(custom.find('.custom-hint').text()).toBe('拖我');
  });
});
