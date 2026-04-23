import { describe, expect, it } from 'vitest';
import { createStableId } from '@/utils/stableId.js';

describe('createStableId', () => {
  it('returns a non-empty unique string', () => {
    const ids = new Set();

    for (let index = 0; index < 20; index += 1) {
      const id = createStableId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      ids.add(id);
    }

    expect(ids.size).toBe(20);
  });
});
