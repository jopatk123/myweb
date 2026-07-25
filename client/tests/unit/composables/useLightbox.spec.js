import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { useLightbox } from '@/composables/useLightbox.js';

describe('useLightbox', () => {
  let lightbox;

  beforeEach(() => {
    lightbox = useLightbox();
    // 确保每次测试从干净状态开始
    lightbox.closeLightbox();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
    vi.restoreAllMocks();
  });

  it('exposes state and navigation methods', () => {
    expect(lightbox.showLightbox).toBeDefined();
    expect(lightbox.currentImageIndex).toBeDefined();
    expect(typeof lightbox.openLightbox).toBe('function');
    expect(typeof lightbox.closeLightbox).toBe('function');
    expect(typeof lightbox.prevImage).toBe('function');
    expect(typeof lightbox.nextImage).toBe('function');
    expect(typeof lightbox.setCurrentImageIndex).toBe('function');
  });

  it('initial state is closed with index 0', () => {
    expect(lightbox.showLightbox.value).toBe(false);
    expect(lightbox.currentImageIndex.value).toBe(0);
  });

  describe('openLightbox', () => {
    it('sets showLightbox=true and stores the given index', () => {
      lightbox.openLightbox(3);

      expect(lightbox.showLightbox.value).toBe(true);
      expect(lightbox.currentImageIndex.value).toBe(3);
    });

    it('hides body scroll by setting overflow:hidden', () => {
      lightbox.openLightbox(0);
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('closeLightbox', () => {
    it('sets showLightbox=false', () => {
      lightbox.openLightbox(2);
      lightbox.closeLightbox();
      expect(lightbox.showLightbox.value).toBe(false);
    });

    it('restores body scroll by clearing overflow', () => {
      lightbox.openLightbox(0);
      expect(document.body.style.overflow).toBe('hidden');

      lightbox.closeLightbox();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('prevImage', () => {
    it('decrements index when not at first', () => {
      lightbox.openLightbox(2);
      lightbox.prevImage(5);
      expect(lightbox.currentImageIndex.value).toBe(1);
    });

    it('wraps to last image when at first', () => {
      lightbox.openLightbox(0);
      lightbox.prevImage(5);
      expect(lightbox.currentImageIndex.value).toBe(4);
    });
  });

  describe('nextImage', () => {
    it('increments index when not at last', () => {
      lightbox.openLightbox(1);
      lightbox.nextImage(5);
      expect(lightbox.currentImageIndex.value).toBe(2);
    });

    it('wraps to first image when at last', () => {
      lightbox.openLightbox(4);
      lightbox.nextImage(5);
      expect(lightbox.currentImageIndex.value).toBe(0);
    });
  });

  describe('setCurrentImageIndex', () => {
    it('directly sets the current index', () => {
      lightbox.setCurrentImageIndex(7);
      expect(lightbox.currentImageIndex.value).toBe(7);
    });
  });
});
