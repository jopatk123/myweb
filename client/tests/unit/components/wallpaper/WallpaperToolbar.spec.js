import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WallpaperToolbar from '@/components/wallpaper/WallpaperToolbar.vue';

describe('WallpaperToolbar', () => {
  it('renders the current keyword in the search input', () => {
    const wrapper = mount(WallpaperToolbar, { props: { keyword: 'cat' } });

    expect(wrapper.find('input').element.value).toBe('cat');
  });

  it('emits update:keyword only after the 200ms debounce window', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(WallpaperToolbar, { props: { keyword: '' } });

      await wrapper.find('input').setValue('hello');
      expect(wrapper.emitted('update:keyword')).toBeUndefined();

      await vi.advanceTimersByTimeAsync(199);
      expect(wrapper.emitted('update:keyword')).toBeUndefined();

      await vi.advanceTimersByTimeAsync(1);
      expect(wrapper.emitted('update:keyword')).toEqual([['hello']]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('collapses rapid keystrokes into a single trailing emit', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(WallpaperToolbar, { props: { keyword: '' } });
      const input = wrapper.find('input');

      await input.setValue('a');
      await vi.advanceTimersByTimeAsync(100);
      await input.setValue('ab');
      await vi.advanceTimersByTimeAsync(300);

      expect(wrapper.emitted('update:keyword')).toEqual([['ab']]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels the pending emit when the component unmounts', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(WallpaperToolbar, { props: { keyword: '' } });

      await wrapper.find('input').setValue('x');
      wrapper.unmount();
      await vi.advanceTimersByTimeAsync(500);

      expect(wrapper.emitted('update:keyword')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
