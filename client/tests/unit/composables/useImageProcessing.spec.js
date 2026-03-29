import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  blobToFile,
} from '@/composables/useImageProcessing.js';

describe('useImageProcessing', () => {
  describe('formatFileSize', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('formats bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('formats megabytes with decimals', () => {
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('formats intermediate values', () => {
      expect(formatFileSize(2560)).toBe('2.5 KB');
    });
  });

  describe('blobToFile', () => {
    it('converts Blob to File with correct name and type', () => {
      const blob = new Blob(['test content'], { type: 'image/jpeg' });
      const file = blobToFile(blob, 'test.jpg');

      expect(file instanceof File).toBe(true);
      expect(file.name).toBe('test.jpg');
      expect(file.type).toBe('image/jpeg');
      expect(file.size).toBe(blob.size);
    });

    it('sets lastModified to current time', () => {
      const before = Date.now();
      const blob = new Blob(['x'], { type: 'image/png' });
      const file = blobToFile(blob, 'img.png');
      const after = Date.now();

      expect(file.lastModified).toBeGreaterThanOrEqual(before);
      expect(file.lastModified).toBeLessThanOrEqual(after);
    });
  });
});
