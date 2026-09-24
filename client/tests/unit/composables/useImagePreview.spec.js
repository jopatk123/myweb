import { describe, it, expect } from 'vitest';
import { useImagePreview } from '@/composables/useImagePreview.js';

describe('useImagePreview', () => {
  describe('getImageUrl', () => {
    it('uploads/ 开头的路径直接使用相对路径，不加 API 前缀', () => {
      const { getImageUrl } = useImagePreview();
      expect(getImageUrl({ path: 'uploads/2026/09/a.png' })).toBe(
        '/uploads/2026/09/a.png'
      );
    });

    it('其他路径拼上默认 API 前缀 /api', () => {
      const { getImageUrl } = useImagePreview();
      expect(getImageUrl({ path: 'images/a.png' })).toBe('/api/images/a.png');
    });

    it('无 path 时回退到 image.url', () => {
      const { getImageUrl } = useImagePreview();
      expect(getImageUrl({ url: 'http://example.com/b.png' })).toBe(
        'http://example.com/b.png'
      );
    });

    it('path 为空字符串视为无 path，走 url 回退', () => {
      const { getImageUrl } = useImagePreview();
      expect(getImageUrl({ path: '', url: 'http://example.com/c.png' })).toBe(
        'http://example.com/c.png'
      );
    });

    it('入参本身就是字符串（无 path/url 属性）时原样返回', () => {
      const { getImageUrl } = useImagePreview();
      expect(getImageUrl('http://example.com/d.png')).toBe(
        'http://example.com/d.png'
      );
    });
  });

  describe('onImageLoad', () => {
    it('是安全的空操作，可随意调用不抛错', () => {
      const { onImageLoad } = useImagePreview();
      expect(() => onImageLoad()).not.toThrow();
    });
  });

  describe('onImageError', () => {
    it('把失败图片的 src 替换为内联 SVG 占位图', () => {
      const { onImageError } = useImagePreview();
      const target = { src: 'http://example.com/broken.png' };

      onImageError({ target });

      expect(target.src).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(target.src).not.toBe('http://example.com/broken.png');
    });

    it('占位图可重复触发（连续多次加载失败不抛错）', () => {
      const { onImageError } = useImagePreview();
      const target = { src: 'x' };
      expect(() => {
        onImageError({ target });
        onImageError({ target });
      }).not.toThrow();
    });
  });
});
