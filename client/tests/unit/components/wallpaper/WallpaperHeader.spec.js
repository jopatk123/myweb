import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import WallpaperHeader from '@/components/wallpaper/WallpaperHeader.vue';

const findButton = (wrapper, label) =>
  wrapper.findAll('button').find(button => button.text().includes(label));

describe('WallpaperHeader', () => {
  it('disables bulk actions and download while nothing is selected', () => {
    const wrapper = mount(WallpaperHeader, { props: { selectedCount: 0 } });

    expect(findButton(wrapper, '删除').attributes('disabled')).toBeDefined();
    expect(findButton(wrapper, '移动').attributes('disabled')).toBeDefined();
    expect(
      findButton(wrapper, '下载壁纸').attributes('disabled')
    ).toBeDefined();

    expect(
      findButton(wrapper, '上传壁纸').attributes('disabled')
    ).toBeUndefined();
    expect(
      findButton(wrapper, '打开桌面').attributes('disabled')
    ).toBeUndefined();
  });

  it('shows the selection count in action labels', () => {
    const wrapper = mount(WallpaperHeader, { props: { selectedCount: 2 } });

    expect(findButton(wrapper, '删除').text()).toContain('删除 (2)');
    expect(findButton(wrapper, '移动').text()).toContain('移动 (2)');
    expect(findButton(wrapper, '下载壁纸').text()).toContain('下载壁纸 (2)');
  });

  it('enables bulk actions once wallpapers are selected', () => {
    const wrapper = mount(WallpaperHeader, { props: { selectedCount: 2 } });

    expect(findButton(wrapper, '删除').attributes('disabled')).toBeUndefined();
    expect(findButton(wrapper, '移动').attributes('disabled')).toBeUndefined();
    expect(
      findButton(wrapper, '下载壁纸').attributes('disabled')
    ).toBeUndefined();
  });

  it('explains via title why download is unavailable or available', () => {
    const empty = mount(WallpaperHeader, { props: { selectedCount: 0 } });
    expect(findButton(empty, '下载壁纸').attributes('title')).toBe(
      '请先选择要下载的壁纸'
    );

    const selected = mount(WallpaperHeader, { props: { selectedCount: 2 } });
    expect(findButton(selected, '下载壁纸').attributes('title')).toBe(
      '下载选中的 2 张壁纸'
    );
  });

  it('shows a busy download state and blocks another click', async () => {
    const wrapper = mount(WallpaperHeader, {
      props: {
        selectedCount: 3,
        downloading: true,
        downloadStatus: '正在打包 3 张壁纸，请勿关闭页面',
      },
    });

    const button = findButton(wrapper, '正在打包');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.attributes('aria-busy')).toBe('true');
    expect(button.attributes('title')).toBe(
      '正在准备文件，请稍候，不要重复点击'
    );
    expect(wrapper.find('[role="status"]').text()).toContain(
      '正在打包 3 张壁纸，请勿关闭页面'
    );

    await button.trigger('click');
    expect(wrapper.emitted('download-wallpapers')).toBeUndefined();
  });

  it('emits the matching action events on click', async () => {
    const wrapper = mount(WallpaperHeader, { props: { selectedCount: 2 } });

    await findButton(wrapper, '删除').trigger('click');
    await findButton(wrapper, '移动').trigger('click');
    await findButton(wrapper, '上传壁纸').trigger('click');
    await findButton(wrapper, '下载壁纸').trigger('click');
    await findButton(wrapper, '打开桌面').trigger('click');

    expect(wrapper.emitted('bulk-delete')).toHaveLength(1);
    expect(wrapper.emitted('bulk-move')).toHaveLength(1);
    expect(wrapper.emitted('open-bulk-upload')).toHaveLength(1);
    expect(wrapper.emitted('download-wallpapers')).toHaveLength(1);
    expect(wrapper.emitted('open-main-window')).toHaveLength(1);
  });
});
