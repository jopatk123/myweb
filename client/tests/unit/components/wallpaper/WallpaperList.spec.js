import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/vue';
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

  it('matches the active wallpaper through wallpaper_id fallback fields', () => {
    const { container } = render(WallpaperList, {
      props: {
        wallpapers,
        activeWallpaper: { wallpaper_id: 1 },
        modelValue: [],
      },
    });

    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].classList.contains('active')).toBe(true);
    expect(rows[1].classList.contains('active')).toBe(false);
  });

  it('does not highlight anything without an active wallpaper', () => {
    const { container } = render(WallpaperList, {
      props: { wallpapers, activeWallpaper: null, modelValue: [] },
    });

    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].classList.contains('active')).toBe(false);
    expect(rows[1].classList.contains('active')).toBe(false);
  });

  it('emits update:modelValue when a row checkbox is toggled', async () => {
    const { container, emitted } = render(WallpaperList, {
      props: { wallpapers, activeWallpaper: null, modelValue: [] },
    });

    await fireEvent.click(
      container.querySelectorAll('tbody input[type="checkbox"]')[0]
    );

    expect(emitted('update:modelValue')).toEqual([[[1]]]);
  });

  it('selects every wallpaper from the header checkbox and reflects the state', async () => {
    const { container, emitted } = render(WallpaperList, {
      props: { wallpapers, activeWallpaper: null, modelValue: [] },
    });
    const headerCheckbox = container.querySelector('thead input');

    await fireEvent.click(headerCheckbox);

    expect(emitted('update:modelValue')).toEqual([[[1, 2]]]);
    expect(container.querySelector('thead input').checked).toBe(true);
  });

  it('clears the selection when select-all is toggled off', async () => {
    const { container, emitted } = render(WallpaperList, {
      props: { wallpapers, activeWallpaper: null, modelValue: [] },
    });
    const headerCheckbox = container.querySelector('thead input');

    await fireEvent.click(headerCheckbox);
    await fireEvent.click(headerCheckbox);

    expect(emitted('update:modelValue')[1]).toEqual([[]]);
    expect(container.querySelector('thead input').checked).toBe(false);
  });

  it('emits edit with the wallpaper and delete with its id', async () => {
    const { container, emitted } = render(WallpaperList, {
      props: { wallpapers, activeWallpaper: null, modelValue: [] },
    });
    const firstRowButtons = container.querySelectorAll(
      'tbody tr:first-child button'
    );

    await fireEvent.click(firstRowButtons[0]);
    await fireEvent.click(firstRowButtons[1]);

    expect(emitted('edit')).toEqual([[wallpapers[0]]]);
    expect(emitted('delete')).toEqual([[1]]);
  });

  it('falls back through originalName and original_name for the display name', () => {
    const { container } = render(WallpaperList, {
      props: {
        wallpapers: [
          { id: 1, originalName: '原始名.png' },
          { id: 2, original_name: '蛇形名.jpg' },
        ],
        activeWallpaper: null,
        modelValue: [],
      },
    });

    const names = Array.from(container.querySelectorAll('.name-truncate')).map(
      node => node.textContent
    );
    expect(names).toEqual(['原始名.png', '蛇形名.jpg']);
  });

  it('formats file sizes with readable units and safe fallbacks', () => {
    const { container } = render(WallpaperList, {
      props: {
        wallpapers: [
          { id: 1, fileSize: 15360 },
          { id: 2, file_size: 1024 },
          // 注意：fileSize 为 0 时组件内 `fileSize || file_size` 会把 0 当缺省
          // 跳过，需走 file_size 才能命中 '0 B' 分支
          { id: 3, file_size: 0 },
          { id: 4, fileSize: null },
        ],
        activeWallpaper: null,
        modelValue: [],
      },
    });

    const sizes = Array.from(container.querySelectorAll('tbody tr')).map(
      row => row.children[3].textContent
    );
    expect(sizes).toEqual(['15 KB', '1.00 KB', '0 B', '-']);
  });

  it('formats upload dates and falls back to a dash for invalid values', () => {
    const { container } = render(WallpaperList, {
      props: {
        wallpapers: [
          { id: 1, createdAt: '2024-01-02T00:00:00Z' },
          { id: 2, created_at: 'not-a-date' },
          { id: 3, createdAt: null },
        ],
        activeWallpaper: null,
        modelValue: [],
      },
    });

    const dates = Array.from(container.querySelectorAll('tbody tr')).map(
      row => row.children[4].textContent
    );
    expect(dates[0]).toMatch(/\d/);
    expect(dates[1]).toBe('-');
    expect(dates[2]).toBe('-');
  });

  it('builds the thumbnail url pinned to the file version', () => {
    const { container } = render(WallpaperList, {
      props: {
        wallpapers: [{ id: 1, filename: 'uuid-abc.jpg' }],
        activeWallpaper: null,
        modelValue: [],
      },
    });

    const src = container.querySelector('img').getAttribute('src');
    const url = new URL(src);
    expect(url.pathname).toBe('/api/wallpapers/1/thumbnail');
    expect(url.searchParams.get('w')).toBe('320');
    expect(url.searchParams.get('format')).toBe('webp');
    // 版本参数绑定文件名而非 updated_at，激活切换不会击穿缩略图缓存
    expect(url.searchParams.get('v')).toBe('uuid-abc.jpg');
  });

  it('uses the raw remote url when the wallpaper has no id', () => {
    const { container } = render(WallpaperList, {
      props: {
        wallpapers: [{ filePath: 'https://cdn.example.com/x.png' }],
        activeWallpaper: null,
        modelValue: [],
      },
    });

    expect(container.querySelector('img').getAttribute('src')).toBe(
      'https://cdn.example.com/x.png'
    );
  });

  it('swaps in the placeholder image when the thumbnail fails to load', async () => {
    const { container } = render(WallpaperList, {
      props: { wallpapers, activeWallpaper: null, modelValue: [] },
    });

    await fireEvent.error(container.querySelector('img'));

    expect(
      container
        .querySelector('img')
        .getAttribute('src')
        .includes('/apps/icons/image-128.svg')
    ).toBe(true);
  });
});
