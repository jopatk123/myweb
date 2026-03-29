import { describe, expect, it, vi } from 'vitest';
import { useSelectionRect } from '@/composables/useSelectionRect.js';

describe('useSelectionRect', () => {
  it('initializes with hidden and zeroed rect', () => {
    const { selectionRect } = useSelectionRect();

    expect(selectionRect.value.visible).toBe(false);
    expect(selectionRect.value.x).toBe(0);
    expect(selectionRect.value.y).toBe(0);
    expect(selectionRect.value.w).toBe(0);
    expect(selectionRect.value.h).toBe(0);
  });

  describe('onMouseDown', () => {
    it('starts selection on left-click (button 0)', () => {
      const { selectionRect, onMouseDown } = useSelectionRect();

      onMouseDown({ button: 0, clientX: 100, clientY: 200 });

      expect(selectionRect.value.visible).toBe(true);
      expect(selectionRect.value.startX).toBe(100);
      expect(selectionRect.value.startY).toBe(200);
    });

    it('ignores right-click', () => {
      const { selectionRect, onMouseDown } = useSelectionRect();

      onMouseDown({ button: 2, clientX: 100, clientY: 200 });

      expect(selectionRect.value.visible).toBe(false);
    });
  });

  describe('onMouseMove', () => {
    it('updates rect dimensions during drag', () => {
      const { selectionRect, onMouseDown, onMouseMove } = useSelectionRect();

      onMouseDown({ button: 0, clientX: 50, clientY: 60 });
      onMouseMove({ clientX: 150, clientY: 200 });

      expect(selectionRect.value.x).toBe(50);
      expect(selectionRect.value.y).toBe(60);
      expect(selectionRect.value.w).toBe(100);
      expect(selectionRect.value.h).toBe(140);
    });

    it('handles reverse drag (moving towards top-left)', () => {
      const { selectionRect, onMouseDown, onMouseMove } = useSelectionRect();

      onMouseDown({ button: 0, clientX: 200, clientY: 200 });
      onMouseMove({ clientX: 50, clientY: 80 });

      expect(selectionRect.value.x).toBe(50);
      expect(selectionRect.value.y).toBe(80);
      expect(selectionRect.value.w).toBe(150);
      expect(selectionRect.value.h).toBe(120);
    });

    it('does nothing when not selecting', () => {
      const { selectionRect, onMouseMove } = useSelectionRect();

      onMouseMove({ clientX: 100, clientY: 100 });

      expect(selectionRect.value.w).toBe(0);
      expect(selectionRect.value.h).toBe(0);
    });
  });

  describe('onMouseUp', () => {
    it('hides selection rect and returns null without hitTestItems', async () => {
      const { selectionRect, onMouseDown, onMouseUp } = useSelectionRect();

      onMouseDown({ button: 0, clientX: 10, clientY: 20 });
      const result = await onMouseUp();

      expect(selectionRect.value.visible).toBe(false);
      expect(result).toBeNull();
    });

    it('calls hitTestItems with rect and returns result', async () => {
      const hitTestItems = vi.fn().mockResolvedValue([1, 2, 3]);
      const { onMouseDown, onMouseMove, onMouseUp } = useSelectionRect({
        hitTestItems,
      });

      onMouseDown({ button: 0, clientX: 10, clientY: 20 });
      onMouseMove({ clientX: 100, clientY: 100 });
      const result = await onMouseUp();

      expect(hitTestItems).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 10,
          y: 20,
          w: 90,
          h: 80,
        })
      );
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns null when not selecting', async () => {
      const { onMouseUp } = useSelectionRect();
      const result = await onMouseUp();
      expect(result).toBeNull();
    });
  });

  it('exposes rectIntersect utility', () => {
    const { rectIntersect } = useSelectionRect();
    expect(typeof rectIntersect).toBe('function');
  });
});
