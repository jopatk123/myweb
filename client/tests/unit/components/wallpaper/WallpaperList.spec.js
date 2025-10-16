import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/vue';
import WallpaperList from '@/components/wallpaper/WallpaperList.vue';

describe('WallpaperList', () => {
  const wallpapers = [
    { id: 1, name: '壁纸一' },
    { id: 2, name: '壁纸二' },
  ];

  it('emits set-active with wallpaper id when button is clicked', async () => {
    const { getAllByRole, emitted } = render(WallpaperList, {
      props: {
        wallpapers,
        activeWallpaper: null,
        modelValue: [],
      },
    });

    const buttons = getAllByRole('button', { name: '设为背景' });
    await fireEvent.click(buttons[0]);

    expect(emitted()['set-active']).toBeTruthy();
    expect(emitted()['set-active'][0][0]).toBe(1);
  });

  it('highlights the active wallpaper row even when id types differ', () => {
    const { container } = render(WallpaperList, {
      props: {
        wallpapers,
        activeWallpaper: { id: '2' },
        modelValue: [],
      },
    });

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].classList.contains('active')).toBe(false);
    expect(rows[1].classList.contains('active')).toBe(true);
  });
});
