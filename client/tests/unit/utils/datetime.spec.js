import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  parseServerDate,
  formatRelativeDate,
} from '@/utils/datetime.js';

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

describe('parseServerDate', () => {
  it('parses SQLite datetime strings as UTC', () => {
    const date = parseServerDate('2025-06-01 10:00:00');
    expect(date).not.toBeNull();
    expect(date.toISOString()).toBe('2025-06-01T10:00:00.000Z');
  });

  it('parses ISO strings and keeps the instant unchanged', () => {
    const date = parseServerDate('2025-06-01T10:00:00.000Z');
    expect(date.toISOString()).toBe('2025-06-01T10:00:00.000Z');
  });

  it('returns null for falsy or invalid input', () => {
    expect(parseServerDate(null)).toBeNull();
    expect(parseServerDate(undefined)).toBeNull();
    expect(parseServerDate('')).toBeNull();
    expect(parseServerDate('not-a-date')).toBeNull();
  });
});

describe('formatRelativeDate', () => {
  it('returns 今天 for the current calendar day', () => {
    const now = new Date();
    const iso = new Date(now.getTime() - 60 * 1000).toISOString();
    expect(formatRelativeDate(iso)).toBe('今天');
  });

  it('returns 昨天 for the previous calendar day', () => {
    const now = new Date();
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      12,
      0,
      0
    ).toISOString();
    expect(formatRelativeDate(yesterday)).toBe('昨天');
  });

  it('returns N天前 within a week', () => {
    const now = new Date();
    const threeDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 3,
      12,
      0,
      0
    ).toISOString();
    expect(formatRelativeDate(threeDaysAgo)).toBe('3天前');
  });

  it('returns a localized date beyond a week', () => {
    const result = formatRelativeDate('2000-01-01 12:00:00');
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/天前|今天|昨天/);
  });

  it('returns empty string for invalid input', () => {
    expect(formatRelativeDate('')).toBe('');
    expect(formatRelativeDate('not-a-date')).toBe('');
  });
});
