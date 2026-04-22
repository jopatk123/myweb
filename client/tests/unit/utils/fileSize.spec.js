import { describe, it, expect } from 'vitest';
import { formatFileSize } from '@/utils/fileSize.js';

describe('formatFileSize utility', () => {
  it('formats common sizes with the default precision', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('supports custom invalid fallbacks', () => {
    expect(formatFileSize(Number.NaN, 1, { invalidValue: '--' })).toBe('--');
    expect(formatFileSize(-1, 1, { invalidValue: '--' })).toBe('--');
  });

  it('supports custom formatter callbacks', () => {
    const wallpaperFormat = bytes =>
      formatFileSize(bytes, 1, {
        invalidValue: '-',
        formatter: ({ value, unit, unitIndex }) =>
          `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 2)} ${unit}`,
      });

    expect(wallpaperFormat(2560)).toBe('2.50 KB');
    expect(wallpaperFormat(10 * 1024)).toBe('10 KB');
    expect(wallpaperFormat(undefined)).toBe('-');
  });
});
