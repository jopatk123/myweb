import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readStorageItem,
  writeStorageItem,
  removeStorageItem,
  readJsonStorageItem,
  writeJsonStorageItem,
} from '@/utils/storage.js';

const originalDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage'
);

// storage.js 直接读取 globalThis.localStorage，这里整体替换成可控桩
function stubStorage(impl) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: impl,
    configurable: true,
    writable: true,
  });
}

function createThrowingStorage(error) {
  return {
    getItem: () => {
      throw error;
    },
    setItem: () => {
      throw error;
    },
    removeItem: () => {
      throw error;
    },
  };
}

afterEach(() => {
  if (originalDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
  } else {
    delete globalThis.localStorage;
  }
});

describe('storage utils', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe('readStorageItem / writeStorageItem / removeStorageItem', () => {
    it('round-trips a value and reports success', () => {
      expect(writeStorageItem('key', 'value')).toBe(true);
      expect(readStorageItem('key')).toBe('value');
      expect(removeStorageItem('key')).toBe(true);
      expect(readStorageItem('key')).toBeNull();
    });

    it('coerces non-string values through String()', () => {
      writeStorageItem('num', 123);
      expect(readStorageItem('num')).toBe('123');

      writeStorageItem('obj', { a: 1 });
      expect(readStorageItem('obj')).toBe('[object Object]');
    });

    it('reports read errors through onError and returns null', () => {
      const error = new Error('read denied');
      const onError = vi.fn();
      stubStorage(createThrowingStorage(error));

      expect(readStorageItem('key', onError)).toBeNull();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('reports write errors through onError and returns false', () => {
      const error = new Error('quota exceeded');
      const onError = vi.fn();
      stubStorage(createThrowingStorage(error));

      expect(writeStorageItem('key', 'value', onError)).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('reports remove errors through onError and returns false', () => {
      const error = new Error('remove denied');
      const onError = vi.fn();
      stubStorage(createThrowingStorage(error));

      expect(removeStorageItem('key', onError)).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('silences failures when no onError callback is given', () => {
      stubStorage(createThrowingStorage(new Error('boom')));

      expect(readStorageItem('key')).toBeNull();
      expect(writeStorageItem('key', 'v')).toBe(false);
      expect(removeStorageItem('key')).toBe(false);
    });

    it('degrades gracefully when localStorage is unavailable', () => {
      stubStorage(undefined);

      expect(readStorageItem('key')).toBeNull();
      expect(writeStorageItem('key', 'value')).toBe(false);
      expect(removeStorageItem('key')).toBe(false);
      expect(readJsonStorageItem('key', 'fallback')).toBe('fallback');
      expect(writeJsonStorageItem('key', { a: 1 })).toBe(false);
    });
  });

  describe('readJsonStorageItem', () => {
    it('parses objects, arrays and primitive JSON values', () => {
      globalThis.localStorage.setItem('cfg', '{"theme":"dark"}');
      globalThis.localStorage.setItem('list', '[1,2,3]');
      globalThis.localStorage.setItem('num', '42');

      expect(readJsonStorageItem('cfg', null)).toEqual({ theme: 'dark' });
      expect(readJsonStorageItem('list', null)).toEqual([1, 2, 3]);
      expect(readJsonStorageItem('num', null)).toBe(42);
    });

    it('returns the fallback for missing or empty values', () => {
      expect(readJsonStorageItem('missing', 'fallback')).toBe('fallback');

      globalThis.localStorage.setItem('empty', '');
      expect(readJsonStorageItem('empty', 'fallback')).toBe('fallback');
    });

    it('returns the fallback and reports onError for invalid JSON', () => {
      const onError = vi.fn();
      globalThis.localStorage.setItem('bad', '{oops');

      expect(readJsonStorageItem('bad', 'fallback', onError)).toBe('fallback');
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toBeInstanceOf(SyntaxError);
    });
  });

  describe('writeJsonStorageItem', () => {
    it('stores the JSON string and reads it back symmetrically', () => {
      const value = { theme: 'dark', size: 2 };

      expect(writeJsonStorageItem('cfg', value)).toBe(true);
      expect(globalThis.localStorage.getItem('cfg')).toBe(
        JSON.stringify(value)
      );
      expect(readJsonStorageItem('cfg', null)).toEqual(value);
    });

    it('reports storage failures through onError and returns false', () => {
      const error = new Error('quota exceeded');
      const onError = vi.fn();
      stubStorage(createThrowingStorage(error));

      expect(writeJsonStorageItem('cfg', { a: 1 }, onError)).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
