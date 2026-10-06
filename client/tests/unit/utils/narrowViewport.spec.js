import { afterEach, describe, expect, it } from 'vitest';
import {
  fitWindowToViewport,
  isNarrowViewport,
  MAXIMIZED_WINDOW_HEIGHT,
  MAXIMIZED_WINDOW_WIDTH,
} from '@/utils/narrowViewport.js';

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

function setViewport(width, height) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

afterEach(() => {
  setViewport(originalWidth, originalHeight);
});

describe('narrowViewport', () => {
  it('treats widths up to 768 as narrow', () => {
    setViewport(768, 800);
    expect(isNarrowViewport()).toBe(true);
    setViewport(769, 800);
    expect(isNarrowViewport()).toBe(false);
  });

  it('keeps desktop window sizes and does not maximize', () => {
    setViewport(1280, 800);
    expect(fitWindowToViewport(650, 700)).toEqual({
      width: 650,
      height: 700,
      maximized: false,
    });
  });

  it('clamps oversized windows and maximizes on a phone viewport', () => {
    setViewport(390, 700);
    expect(fitWindowToViewport(650, 800)).toEqual({
      width: 374,
      height: 636,
      maximized: true,
    });
  });

  it('sizes a maximized window to the dynamic viewport above the taskbar', () => {
    expect(MAXIMIZED_WINDOW_WIDTH).toBe('100dvw');
    expect(MAXIMIZED_WINDOW_HEIGHT).toContain('100dvh');
    expect(MAXIMIZED_WINDOW_HEIGHT).toContain('48px');
    expect(MAXIMIZED_WINDOW_HEIGHT).toContain('safe-area-inset-bottom');
  });

  it('does not treat a missing viewport as narrow', () => {
    setViewport(0, 0);
    expect(isNarrowViewport()).toBe(false);
    expect(fitWindowToViewport(520, 400)).toEqual({
      width: 520,
      height: 400,
      maximized: false,
    });
  });
});
