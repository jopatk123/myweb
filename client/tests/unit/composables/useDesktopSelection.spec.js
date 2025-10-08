import { describe, expect, it, vi } from 'vitest';
import useDesktopSelection from '@/composables/useDesktopSelection.js';

const createMouseEvent = ({
  button = 0,
  clientX = 10,
  clientY = 20,
  targetIsIcon = false,
} = {}) => {
  const closest = vi.fn().mockReturnValue(targetIsIcon ? {} : null);
  return {
    button,
    clientX,
    clientY,
    target: { closest },
  };
};

describe('useDesktopSelection', () => {
  it('does not start selection on right-click', () => {
    const { selectionRect, onMouseDown, onMouseMove } = useDesktopSelection();
    const event = createMouseEvent({ button: 2, clientX: 100, clientY: 120 });

    onMouseDown(event);
    onMouseMove({ clientX: 140, clientY: 160 });

    expect(event.target.closest).not.toHaveBeenCalled();
    expect(selectionRect.value.visible).toBe(false);
    expect(selectionRect.value.w).toBe(0);
    expect(selectionRect.value.h).toBe(0);
    expect(selectionRect.value.x).toBe(0);
    expect(selectionRect.value.y).toBe(0);
  });

  it('starts selection on left-click in empty area', () => {
    const { selectionRect, onMouseDown, onMouseMove, onMouseUp } =
      useDesktopSelection();
    const event = createMouseEvent({ button: 0, clientX: 50, clientY: 60 });

    onMouseDown(event);
    onMouseMove({ clientX: 70, clientY: 90 });

    expect(event.target.closest).toHaveBeenCalledWith('.icon-item');
    expect(selectionRect.value.visible).toBe(true);
    expect(selectionRect.value.x).toBe(50);
    expect(selectionRect.value.y).toBe(60);
    expect(selectionRect.value.w).toBe(20);
    expect(selectionRect.value.h).toBe(30);

    onMouseUp();
    expect(selectionRect.value.visible).toBe(false);
  });

  it('ignores left-click directly on icons', () => {
    const { selectionRect, onMouseDown } = useDesktopSelection();
    const event = createMouseEvent({ button: 0, targetIsIcon: true });

    onMouseDown(event);

    expect(selectionRect.value.visible).toBe(false);
  });
});
