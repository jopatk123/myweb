import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ImagePreview from '@/components/message-board/ImagePreview.vue';

// ---- composable mocks（holder 模式：测试内可读写状态） ----
const lightbox = vi.hoisted(() => ({ current: null }));
const ctxMenu = vi.hoisted(() => ({ current: null }));
const downloader = vi.hoisted(() => ({ current: null }));

vi.mock('@/composables/useLightbox.js', async () => {
  const { ref } = await import('vue');
  const state = {
    showLightbox: ref(false),
    currentImageIndex: ref(0),
    openLightbox: vi.fn(index => {
      state.currentImageIndex.value = index;
      state.showLightbox.value = true;
    }),
    closeLightbox: vi.fn(() => {
      state.showLightbox.value = false;
    }),
    prevImage: vi.fn(),
    nextImage: vi.fn(),
    setCurrentImageIndex: vi.fn(),
  };
  lightbox.current = state;
  return { useLightbox: () => state };
});

vi.mock('@/composables/useContextMenu.js', async () => {
  const { ref } = await import('vue');
  const state = {
    contextMenuVisible: ref(false),
    contextMenuPosition: ref({ x: 0, y: 0 }),
    contextMenuTarget: ref(null),
    showContextMenu: vi.fn((event, target) => {
      state.contextMenuTarget.value = target;
      state.contextMenuVisible.value = true;
    }),
    closeContextMenu: vi.fn(),
    handleContextMenuAction: vi.fn(),
  };
  ctxMenu.current = state;
  return { useContextMenu: () => state };
});

vi.mock('@/composables/useImageDownload.js', async () => {
  const state = { saveImage: vi.fn(async () => {}) };
  downloader.current = state;
  return { useImageDownload: () => state };
});

vi.mock('@/composables/useImagePreview.js', () => ({
  useImagePreview: () => ({
    getImageUrl: image => image?.url || 'fallback',
    onImageLoad: vi.fn(),
    onImageError: vi.fn(),
  }),
}));

// ---- 子组件桩 ----
vi.mock('@/components/message-board/ImageGrid.vue', () => ({
  default: {
    name: 'ImageGridStub',
    props: ['images'],
    emits: ['image-click', 'context-menu'],
    template: `<div class="grid-stub">
      <button class="grid-open" @click="$emit('image-click', 2)"></button>
      <button class="grid-ctx" @click="$emit('context-menu', fakeEvent, images[2], 2)"></button>
    </div>`,
    data: () => ({
      fakeEvent: { clientX: 30, clientY: 40, preventDefault: () => {} },
    }),
  },
}));

vi.mock('@/components/message-board/LightboxViewer.vue', () => ({
  default: {
    name: 'LightboxViewerStub',
    props: ['visible', 'images', 'currentIndex'],
    emits: ['close', 'prev', 'next', 'save', 'select'],
    template: `<div class="lightbox-stub">
      <button class="lb-close" @click="$emit('close')"></button>
      <button class="lb-prev" @click="$emit('prev')"></button>
      <button class="lb-next" @click="$emit('next')"></button>
      <button class="lb-save" @click="$emit('save', images[currentIndex])"></button>
      <button class="lb-select" @click="$emit('select', 2)"></button>
    </div>`,
  },
}));

vi.mock('@/components/message-board/ContextMenu.vue', () => ({
  default: {
    name: 'ContextMenuStub',
    props: ['visible', 'position'],
    emits: ['action'],
    template: `<div class="ctx-stub">
      <button class="ctx-view" @click="$emit('action', 'view')"></button>
      <button class="ctx-save" @click="$emit('action', 'save')"></button>
    </div>`,
  },
}));

const images = [
  { id: 1, url: 'blob:a', originalName: 'a.png' },
  { id: 2, url: 'blob:b', originalName: 'b.png' },
  { id: 3, url: 'blob:c', originalName: 'c.png' },
];

const mountPreview = () =>
  mount(ImagePreview, {
    props: { images },
    attachTo: document.body,
  });

describe('ImagePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lightbox.current.showLightbox.value = false;
    lightbox.current.currentImageIndex.value = 0;
    ctxMenu.current.contextMenuVisible.value = false;
    ctxMenu.current.contextMenuTarget.value = null;
  });

  it('opens the lightbox with the clicked image index', async () => {
    const wrapper = mountPreview();
    await wrapper.find('.grid-open').trigger('click');

    expect(lightbox.current.openLightbox).toHaveBeenCalledWith(2);
    expect(lightbox.current.showLightbox.value).toBe(true);
    expect(
      wrapper.findComponent({ name: 'LightboxViewerStub' }).props('visible')
    ).toBe(true);
    wrapper.unmount();
  });

  it('forwards context-menu events with image payload', async () => {
    const wrapper = mountPreview();
    await wrapper.find('.grid-ctx').trigger('click');

    expect(ctxMenu.current.showContextMenu).toHaveBeenCalledTimes(1);
    const [event, target] = ctxMenu.current.showContextMenu.mock.calls[0];
    expect(event.clientX).toBe(30);
    expect(target).toEqual({ image: images[2], index: 2 });
    wrapper.unmount();
  });

  it('routes lightbox close/prev/next/select to the lightbox composable', async () => {
    const wrapper = mountPreview();
    await wrapper.find('.lb-close').trigger('click');
    await wrapper.find('.lb-prev').trigger('click');
    await wrapper.find('.lb-next').trigger('click');
    await wrapper.find('.lb-select').trigger('click');

    expect(lightbox.current.closeLightbox).toHaveBeenCalledTimes(1);
    expect(lightbox.current.prevImage).toHaveBeenCalledWith(images.length);
    expect(lightbox.current.nextImage).toHaveBeenCalledWith(images.length);
    expect(lightbox.current.setCurrentImageIndex).toHaveBeenCalledWith(2);
    wrapper.unmount();
  });

  it('passes the current image to the download composable on save', async () => {
    const wrapper = mountPreview();
    lightbox.current.currentImageIndex.value = 1;
    await nextTick();
    await wrapper.find('.lb-save').trigger('click');

    expect(downloader.current.saveImage).toHaveBeenCalledWith(
      images[1],
      expect.any(Function)
    );
    wrapper.unmount();
  });

  it('handles context menu actions through the registered handlers', async () => {
    const wrapper = mountPreview();

    await wrapper.find('.ctx-save').trigger('click');
    const [saveAction, saveHandlers] =
      ctxMenu.current.handleContextMenuAction.mock.calls[0];
    expect(saveAction).toBe('save');
    saveHandlers.save({ image: images[0] });
    expect(downloader.current.saveImage).toHaveBeenCalledWith(
      images[0],
      expect.any(Function)
    );

    await wrapper.find('.ctx-view').trigger('click');
    const [viewAction, viewHandlers] =
      ctxMenu.current.handleContextMenuAction.mock.calls[1];
    expect(viewAction).toBe('view');
    viewHandlers.view({ index: 2 });
    expect(lightbox.current.openLightbox).toHaveBeenCalledWith(2);
    wrapper.unmount();
  });

  it('ignores keyboard shortcuts while the lightbox is closed', async () => {
    const wrapper = mountPreview();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    await flushPromises();

    expect(lightbox.current.closeLightbox).not.toHaveBeenCalled();
    expect(lightbox.current.prevImage).not.toHaveBeenCalled();
    expect(downloader.current.saveImage).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('supports Escape / arrows / S shortcuts while the lightbox is open', async () => {
    const wrapper = mountPreview();
    lightbox.current.showLightbox.value = true;
    lightbox.current.currentImageIndex.value = 1;
    await nextTick();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(lightbox.current.prevImage).toHaveBeenCalledWith(images.length);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(lightbox.current.nextImage).toHaveBeenCalledWith(images.length);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    expect(downloader.current.saveImage).toHaveBeenCalledWith(
      images[1],
      expect.any(Function)
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }));
    expect(downloader.current.saveImage).toHaveBeenCalledTimes(2);

    // Escape 关闭查看器
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(lightbox.current.closeLightbox).toHaveBeenCalledTimes(1);

    // 关闭后快捷键失效
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(lightbox.current.prevImage).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('removes the keydown listener on unmount', async () => {
    const wrapper = mountPreview();
    lightbox.current.showLightbox.value = true;
    await nextTick();
    wrapper.unmount();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(lightbox.current.closeLightbox).not.toHaveBeenCalled();
  });
});
