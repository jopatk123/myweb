import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import LightboxViewer from '@/components/message-board/LightboxViewer.vue';

vi.mock('@/composables/useImagePreview.js', () => ({
  useImagePreview: () => ({
    getImageUrl: image => `resolved:${image.path}`,
    onImageLoad: vi.fn(),
    onImageError: vi.fn(),
  }),
}));

const images = [
  { path: 'uploads/1.png', originalName: 'one.png' },
  { path: 'uploads/2.png', originalName: 'two.png' },
  { path: 'uploads/3.png' },
];

const renderViewer = (props = {}) =>
  render(LightboxViewer, {
    props: { visible: true, images, currentIndex: 0, ...props },
  });

describe('LightboxViewer', () => {
  it('renders nothing when not visible', () => {
    const { container } = renderViewer({ visible: false });
    expect(container.querySelector('.lightbox')).toBeNull();
  });

  it('shows the current image resolved through the preview composable', () => {
    const { container } = renderViewer({ currentIndex: 1 });
    const img = container.querySelector('.lightbox-image');
    expect(img.getAttribute('src')).toBe('resolved:uploads/2.png');
    expect(img.getAttribute('alt')).toBe('two.png');
  });

  it('hides navigation and indicators for a single image', () => {
    const { container } = renderViewer({ images: [images[0]] });
    expect(container.querySelector('.lightbox-prev')).toBeNull();
    expect(container.querySelector('.lightbox-next')).toBeNull();
    expect(container.querySelector('.lightbox-indicators')).toBeNull();
    expect(container.querySelector('.save-image-btn')).not.toBeNull();
  });

  it('emits close from the backdrop and the close button', async () => {
    const { container, emitted } = renderViewer();
    await fireEvent.click(container.querySelector('.lightbox-close'));
    expect(emitted().close).toHaveLength(1);

    // 背景点击关闭
    await fireEvent.click(container.querySelector('.lightbox'));
    expect(emitted().close).toHaveLength(2);

    // 内容区域点击不冒泡关闭
    await fireEvent.click(container.querySelector('.lightbox-content'));
    expect(emitted().close).toHaveLength(2);
  });

  it('emits prev/next from the nav buttons', async () => {
    const { container, emitted } = renderViewer();
    await fireEvent.click(container.querySelector('.lightbox-prev'));
    await fireEvent.click(container.querySelector('.lightbox-next'));

    expect(emitted().prev).toHaveLength(1);
    expect(emitted().next).toHaveLength(1);
  });

  it('emits save with the current image and select with the clicked index', async () => {
    const { container, emitted } = renderViewer({ currentIndex: 2 });
    await fireEvent.click(container.querySelector('.save-image-btn'));
    expect(emitted().save[0][0]).toEqual(images[2]);

    const dots = container.querySelectorAll('.indicator');
    expect(dots).toHaveLength(3);
    expect(dots[2].classList.contains('active')).toBe(true);
    await fireEvent.click(dots[0]);
    expect(emitted().select[0][0]).toBe(0);
  });

  it('shows a loading state that clears when the image loads', async () => {
    const { container, rerender, getByRole } = renderViewer({
      visible: false,
    });
    expect(container.querySelector('.image-loading')).toBeNull();

    // 打开查看器时进入加载态
    await rerender({ visible: true });
    expect(container.querySelector('.image-loading')).not.toBeNull();

    await fireEvent.load(getByRole('img'));
    expect(container.querySelector('.image-loading')).toBeNull();
  });

  it('clears the loading state when the image fails to load', async () => {
    const { container, rerender, getByRole } = renderViewer({
      visible: false,
    });
    await rerender({ visible: true });
    expect(container.querySelector('.image-loading')).not.toBeNull();

    await fireEvent.error(getByRole('img'));
    expect(container.querySelector('.image-loading')).toBeNull();
  });

  it('re-enters the loading state when switching images or reopening', async () => {
    const { container, rerender, getByRole } = renderViewer();
    await fireEvent.load(getByRole('img'));
    expect(container.querySelector('.image-loading')).toBeNull();

    await rerender({ currentIndex: 1 });
    expect(container.querySelector('.image-loading')).not.toBeNull();

    await fireEvent.load(getByRole('img'));
    await rerender({ visible: false });
    await rerender({ visible: true });
    expect(container.querySelector('.image-loading')).not.toBeNull();
  });
});
