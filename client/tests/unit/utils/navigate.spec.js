import { describe, it, expect, vi } from 'vitest';
import { navigateInPlace } from '@/utils/navigate.js';

describe('navigateInPlace', () => {
  it('在当前页面的 location 上执行 assign', () => {
    const locationRef = { assign: vi.fn() };

    navigateInPlace('https://example.com', locationRef);

    expect(locationRef.assign).toHaveBeenCalledWith('https://example.com');
  });
});
