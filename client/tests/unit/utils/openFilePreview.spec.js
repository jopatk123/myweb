import { describe, expect, it, vi } from 'vitest';

const wmMock = vi.hoisted(() => {
  const createWindow = vi.fn(() => ({ id: 'win-1' }));
  const useWindowManager = vi.fn(() => ({ createWindow }));
  return { createWindow, useWindowManager };
});

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: wmMock.useWindowManager,
}));

vi.mock('@/components/file/FilePreviewWindow.vue', () => ({
  default: { name: 'FilePreviewWindowStub' },
}));

import { openFilePreviewWindow } from '@/utils/openFilePreview.js';

function lastWindowConfig() {
  return wmMock.createWindow.mock.calls.at(-1)[0];
}

describe('openFilePreviewWindow', () => {
  it('returns null for falsy files without touching the window manager', () => {
    expect(openFilePreviewWindow(null)).toBeNull();
    expect(openFilePreviewWindow(undefined)).toBeNull();
    expect(wmMock.useWindowManager).not.toHaveBeenCalled();
  });

  it('opens a preview window sized to the viewport with the file prop', () => {
    const file = { id: 'f1', originalName: '报表.xlsx' };

    const win = openFilePreviewWindow(file);

    expect(win).toEqual({ id: 'win-1' });
    expect(wmMock.useWindowManager).toHaveBeenCalledWith({
      autoCleanup: false,
    });
    const config = lastWindowConfig();
    expect(config.component).toEqual({ name: 'FilePreviewWindowStub' });
    expect(config.title).toBe('报表.xlsx');
    expect(config.appSlug).toBe('filePreview');
    expect(config.props).toEqual({ file });
    expect(config.storageKey).toBe('previewPos:f1');
    expect(config.width).toBe(Math.min(1200, window.innerWidth * 0.9));
    expect(config.height).toBe(Math.min(800, window.innerHeight * 0.9));
  });

  it('clamps the window size to 1200x800 on very large viewports', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 5000,
      configurable: true,
    });
    try {
      openFilePreviewWindow({ id: 'f2' });
      const config = lastWindowConfig();
      expect(config.width).toBe(1200);
      expect(config.height).toBe(800);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        value: originalWidth,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: originalHeight,
        configurable: true,
      });
    }
  });

  it('falls back to snake_case name, then a generic title', () => {
    openFilePreviewWindow({ id: 'f3', original_name: 'a.txt' });
    expect(lastWindowConfig().title).toBe('a.txt');

    openFilePreviewWindow({ id: 'f4' });
    expect(lastWindowConfig().title).toBe('文件预览');
  });

  it('returns null and warns when window creation throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    wmMock.createWindow.mockImplementationOnce(() => {
      throw new Error('window manager exploded');
    });

    const result = openFilePreviewWindow({ id: 'f5', originalName: 'x' });

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'openFilePreviewWindow failed',
      expect.any(Error)
    );
  });
});
