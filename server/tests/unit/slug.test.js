import { jest } from '@jest/globals';
import { generateSlug, generateUniqueSlug } from '../../src/utils/slug.js';

describe('slug utilities', () => {
  describe('generateSlug()', () => {
    test('converts English words to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    test('converts Chinese characters with hyphens between each char', () => {
      const result = generateSlug('中文应用');
      expect(result).toBeTruthy();
      // Chinese characters are kept with hyphens between them
      expect(result).toContain('-');
    });

    test('removes special characters (keeps letters, numbers, Chinese, hyphens)', () => {
      const result = generateSlug('Hello!@#World');
      // !@# are removed; no space/hyphen between Hello and World, so result is 'helloworld'
      expect(result).toBe('helloworld');
    });

    test('collapses multiple hyphens', () => {
      const result = generateSlug('hello---world');
      expect(result).toBe('hello-world');
    });

    test('trims leading and trailing hyphens', () => {
      const result = generateSlug('-hello-');
      expect(result).toBe('hello');
    });

    test('returns empty string for empty input', () => {
      expect(generateSlug('')).toBe('');
    });

    test('returns empty string for null input', () => {
      expect(generateSlug(null)).toBe('');
    });

    test('returns empty string for undefined input', () => {
      expect(generateSlug(undefined)).toBe('');
    });

    test('handles mixed Chinese and English', () => {
      const result = generateSlug('My App 我的应用');
      expect(result).toBeTruthy();
    });

    test('converts number to string', () => {
      expect(generateSlug(123)).toBe('123');
    });
  });

  describe('generateUniqueSlug()', () => {
    test('returns same slug when it does not exist', () => {
      const existsCheck = jest.fn(() => false);
      const result = generateUniqueSlug('Hello World', existsCheck);
      expect(result).toBe('hello-world');
      expect(existsCheck).toHaveBeenCalledWith('hello-world');
    });

    test('appends counter when slug already exists', () => {
      const existsCheck = jest.fn(slug => {
        return slug === 'hello-world'; // only 'hello-world' already exists
      });
      const result = generateUniqueSlug('Hello World', existsCheck);
      expect(result).toBe('hello-world-1');
    });

    test('increments counter until unique', () => {
      const taken = new Set(['my-app', 'my-app-1', 'my-app-2']);
      const existsCheck = jest.fn(slug => taken.has(slug));
      const result = generateUniqueSlug('My App', existsCheck);
      expect(result).toBe('my-app-3');
    });

    test('uses timestamp-based slug for all-special-char input', () => {
      const existsCheck = jest.fn(() => false);
      const result = generateUniqueSlug('!@#$', existsCheck);
      expect(result).toMatch(/^app-\d+$/);
    });
  });
});
