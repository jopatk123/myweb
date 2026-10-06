export const NARROW_VIEWPORT_MAX_WIDTH = 768;
export const TASKBAR_HEIGHT = 48;
export const VIEWPORT_GUTTER = 16;
export const MIN_WINDOW_WIDTH = 280;
export const MIN_WINDOW_HEIGHT = 240;
export const MAXIMIZED_WINDOW_WIDTH = '100dvw';
export const MAXIMIZED_WINDOW_HEIGHT =
  'calc(100dvh - 48px - env(safe-area-inset-bottom, 0px))';

function readViewportSize() {
  if (typeof window === 'undefined') return null;
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (!width || !height) return null;
  return { width, height };
}

export function isNarrowViewport() {
  const viewport = readViewportSize();
  if (!viewport) return false;
  return viewport.width <= NARROW_VIEWPORT_MAX_WIDTH;
}

/**
 * 把窗口宽高限制在视口内。窄屏额外默认最大化，避免 600px 以上的应用窗口伸出屏幕。
 */
export function fitWindowToViewport(width, height) {
  const viewport = readViewportSize();
  if (!viewport) {
    return { width, height, maximized: false };
  }

  const maxWidth = Math.max(MIN_WINDOW_WIDTH, viewport.width - VIEWPORT_GUTTER);
  const maxHeight = Math.max(
    MIN_WINDOW_HEIGHT,
    viewport.height - TASKBAR_HEIGHT - VIEWPORT_GUTTER
  );

  return {
    width: Math.min(width, maxWidth),
    height: Math.min(height, maxHeight),
    maximized: viewport.width <= NARROW_VIEWPORT_MAX_WIDTH,
  };
}
