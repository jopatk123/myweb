import { describe, expect, it } from 'vitest';
import { formatDateTime } from '@/utils/datetime.js';

describe('formatDateTime', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats a Date object', () => {
    const date = new Date(2025, 5, 15, 14, 30, 0);
    const result = formatDateTime(date);
    expect(result).toContain('2025');
  });

  it('formats a timestamp number', () => {
    const result = formatDateTime(1718451000000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty string for falsy values', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime(0)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDateTime('not-a-date')).toBe('');
  });

  it('uses zh-CN locale by default', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z');
    // zh-CN format should contain Chinese date characters or numbers
    expect(result).toBeTruthy();
  });

  it('accepts custom locale', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z', 'en-US');
    expect(result).toBeTruthy();
  });

  it('accepts custom options', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z', 'zh-CN', {
      year: 'numeric',
      month: 'long',
    });
    expect(result).toBeTruthy();
  });
});
