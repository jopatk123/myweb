import { describe, expect, it } from 'vitest';
import { generateId } from '@/utils/idGenerator.js';

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns a non-empty string', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('contains alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
