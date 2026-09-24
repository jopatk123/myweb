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

  it('normalizes inverted drag directions while selecting', () => {
    const { selectionRect, onMouseDown, onMouseMove } = useDesktopSelection();

    onMouseDown(createMouseEvent({ clientX: 100, clientY: 100 }));
    onMouseMove({ clientX: 40, clientY: 60 });

    expect(selectionRect.value.x).toBe(40);
    expect(selectionRect.value.y).toBe(60);
    expect(selectionRect.value.w).toBe(60);
    expect(selectionRect.value.h).toBe(40);
  });

  it('ignores mousemove and mouseup before selection starts', () => {
    const { selectionRect, onMouseMove, onMouseUp } = useDesktopSelection();

    onMouseMove({ clientX: 30, clientY: 30 });
    onMouseUp();

    expect(selectionRect.value.visible).toBe(false);
    expect(selectionRect.value.x).toBe(0);
    expect(selectionRect.value.w).toBe(0);
  });

  it('collects intersecting icon ids grouped into apps and files', () => {
    const {
      selectionRect,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      getSelectedIconIds,
    } = useDesktopSelection();

    onMouseDown(createMouseEvent({ clientX: 0, clientY: 0 }));
    onMouseMove({ clientX: 200, clientY: 200 });

    const makeIcon = (id, group, left, top) => ({
      getBoundingClientRect: () => ({ left, top, width: 80, height: 80 }),
      getAttribute: () => String(id),
      closest: () => (group ? { dataset: { group } } : null),
    });
    const items = [
      makeIcon(1, 'apps', 10, 10), // 相交 → apps
      makeIcon(2, 'files', 50, 50), // 相交 → files
      makeIcon(3, 'apps', 400, 400), // 不相交
      makeIcon(4, null, 90, 90), // 相交、无分组容器 → files
    ];
    const querySpy = vi
      .spyOn(document, 'querySelectorAll')
      .mockReturnValue(items);

    expect(getSelectedIconIds()).toEqual({ apps: [1], files: [2, 4] });
    expect(selectionRect.value.visible).toBe(true);

    querySpy.mockRestore();
    onMouseUp();
    expect(selectionRect.value.visible).toBe(false);
  });
});
