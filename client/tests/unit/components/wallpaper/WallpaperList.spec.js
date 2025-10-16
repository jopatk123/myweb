import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/vue';
import WallpaperList from '@/components/wallpaper/WallpaperList.vue';

describe('WallpaperList', () => {
  const wallpapers = [
    { id: 1, name: '壁纸一' },
    { id: 2, name: '壁纸二' },
  ];

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
