import { describe, expect, it } from 'vitest';
import { validateAppIconFile } from '@/utils/appIconFile.js';
import { APP_ICON_MAX_UPLOAD_BYTES } from '@shared/app-icons.js';

describe('validateAppIconFile', () => {
  it('accepts png files', () => {
    const file = new File(['x'], 'icon.png', { type: 'image/png' });
    expect(validateAppIconFile(file)).toEqual({ ok: true });
  });

  it('accepts svg by extension when mime is empty', () => {
    const file = new File(['<svg></svg>'], 'icon.svg', { type: '' });
    expect(validateAppIconFile(file)).toEqual({ ok: true });
  });

  it('rejects missing file', () => {
    expect(validateAppIconFile(null).ok).toBe(false);
  });

  it('rejects oversized files', () => {
    const file = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', {
      value: APP_ICON_MAX_UPLOAD_BYTES + 1,
    });
    expect(validateAppIconFile(file).message).toMatch(/5MB/);
  });

  it('rejects unsupported types', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    expect(validateAppIconFile(file).ok).toBe(false);
  });
});
