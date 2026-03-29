import { describe, expect, it } from 'vitest';
import { rectIntersect } from '@/utils/geometry.js';

describe('rectIntersect', () => {
  it('returns true when rectangles overlap', () => {
    const rect1 = { x: 0, y: 0, w: 100, h: 100 };
    const rect2 = { left: 50, top: 50, width: 100, height: 100 };

    expect(rectIntersect(rect1, rect2)).toBe(true);
  });

  it('returns false when rectangles do not overlap', () => {
    const rect1 = { x: 0, y: 0, w: 50, h: 50 };
    const rect2 = { left: 200, top: 200, width: 50, height: 50 };

    expect(rectIntersect(rect1, rect2)).toBe(false);
  });

  it('returns true when one rectangle contains the other', () => {
    const rect1 = { x: 0, y: 0, w: 200, h: 200 };
    const rect2 = { left: 50, top: 50, width: 20, height: 20 };

    expect(rectIntersect(rect1, rect2)).toBe(true);
  });

  it('returns true when rectangles share an edge', () => {
    const rect1 = { x: 0, y: 0, w: 100, h: 100 };
    const rect2 = { left: 100, top: 0, width: 100, height: 100 };

    expect(rectIntersect(rect1, rect2)).toBe(true);
  });

  it('returns false when rect1 is to the right of rect2', () => {
    const rect1 = { x: 300, y: 0, w: 50, h: 50 };
    const rect2 = { left: 0, top: 0, width: 50, height: 50 };

    expect(rectIntersect(rect1, rect2)).toBe(false);
  });

  it('returns false when rect1 is below rect2', () => {
    const rect1 = { x: 0, y: 300, w: 50, h: 50 };
    const rect2 = { left: 0, top: 0, width: 50, height: 50 };

    expect(rectIntersect(rect1, rect2)).toBe(false);
  });

  it('handles zero-size rectangles', () => {
    const rect1 = { x: 10, y: 10, w: 0, h: 0 };
    const rect2 = { left: 10, top: 10, width: 100, height: 100 };

    expect(rectIntersect(rect1, rect2)).toBe(true);
  });
});
