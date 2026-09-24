import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import ImageGrid from '@/components/message-board/ImageGrid.vue';

vi.mock('@/composables/useImagePreview.js', () => ({
  useImagePreview: () => ({
    getImageUrl: image => `resolved:${image.path}`,
    onImageLoad: vi.fn(),
    onImageError: vi.fn(event => {
      event.target.src = 'fallback';
    }),
  }),
}));

const images = [
  { id: 1, path: 'uploads/1.png', originalName: 'one.png' },
  { id: 2, path: 'uploads/2.png', originalName: 'two.png' },
];

describe('ImageGrid', () => {
  it('renders one lazy item per image and marks single-image grids', () => {
    const single = render(ImageGrid, { props: { images: [images[0]] } });
    expect(single.container.querySelector('.single-image')).not.toBeNull();
    expect(single.container.querySelectorAll('.image-item')).toHaveLength(1);

    single.unmount();

    const multiple = render(ImageGrid, { props: { images } });
    expect(multiple.container.querySelector('.single-image')).toBeNull();
    expect(multiple.container.querySelectorAll('.image-item')).toHaveLength(2);
  });

  it('resolves the image url and alt text through the preview composable', () => {
    const { container } = render(ImageGrid, { props: { images } });
    const img = container.querySelectorAll('img')[0];

    expect(img.getAttribute('src')).toBe('resolved:uploads/1.png');
    expect(img.getAttribute('alt')).toBe('one.png');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('emits image-click with the item index', async () => {
    const { container, emitted } = render(ImageGrid, { props: { images } });
    const items = container.querySelectorAll('.image-item');

    await fireEvent.click(items[1]);
    expect(emitted()['image-click'][0][0]).toBe(1);
  });

  it('emits context-menu with event, image and index', async () => {
    const { container, emitted } = render(ImageGrid, { props: { images } });
    const items = container.querySelectorAll('.image-item');

    await fireEvent.contextMenu(items[0]);

    const [event, image, index] = emitted('context-menu')[0];
    expect(event).toBeTruthy();
    expect(image).toEqual(images[0]);
    expect(index).toBe(0);
  });

  it('swaps in the placeholder image when loading fails', async () => {
    const { container } = render(ImageGrid, { props: { images } });
    const img = container.querySelector('img');

    await fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('fallback');
  });
});
