import { jest } from '@jest/globals';
import {
  camelToSnake,
  snakeToCamel,
  normalizeKeys,
  normalizeResponseKeys,
  normalizeRequestKeys,
} from '../../src/utils/case-helper.js';

describe('case-helper', () => {
  describe('camelToSnake', () => {
    test('converts camelCase to snake_case', () => {
      expect(camelToSnake('camelCase')).toBe('camel_case');
      expect(camelToSnake('groupId')).toBe('group_id');
      expect(camelToSnake('isAutostart')).toBe('is_autostart');
    });

    test('handles single word lowercase', () => {
      expect(camelToSnake('name')).toBe('name');
    });

    test('handles leading uppercase by stripping leading underscore', () => {
      expect(camelToSnake('HelloWorld')).toBe('hello_world');
    });

    test('coerces non-string input to string', () => {
      expect(camelToSnake(123)).toBe('123');
    });
  });

  describe('snakeToCamel', () => {
    test('converts snake_case to camelCase', () => {
      expect(snakeToCamel('group_id')).toBe('groupId');
      expect(snakeToCamel('is_autostart')).toBe('isAutostart');
    });

    test('leaves single word unchanged', () => {
      expect(snakeToCamel('name')).toBe('name');
    });

    test('handles consecutive underscores by uppercasing only first', () => {
      // snakeToCamel replaces _([a-z]) globally; double underscore only triggers once
      expect(snakeToCamel('a__b')).toBe('a_B');
    });
  });

  describe('normalizeKeys', () => {
    test('converts object keys from snake_case to camelCase', () => {
      const result = normalizeKeys({ group_id: 1, is_autostart: true });
      expect(result).toEqual({ groupId: 1, isAutostart: true });
    });

    test('recursively converts nested objects', () => {
      const result = normalizeKeys({
        outer_id: 1,
        nested: { inner_id: 2 },
      });
      expect(result).toEqual({
        outerId: 1,
        nested: { innerId: 2 },
      });
    });

    test('recursively converts arrays of objects', () => {
      const result = normalizeKeys([{ item_id: 1 }, { item_id: 2 }]);
      expect(result).toEqual([{ itemId: 1 }, { itemId: 2 }]);
    });

    test('returns primitive values unchanged', () => {
      expect(normalizeKeys('string')).toBe('string');
      expect(normalizeKeys(42)).toBe(42);
      expect(normalizeKeys(null)).toBe(null);
    });

    test('returns empty object for empty object input', () => {
      expect(normalizeKeys({})).toEqual({});
    });
  });

  describe('normalizeResponseKeys', () => {
    test('converts nested object keys to camelCase', () => {
      const result = normalizeResponseKeys({
        user_id: 1,
        data: { created_at: 'now' },
      });
      expect(result).toEqual({ userId: 1, data: { createdAt: 'now' } });
    });

    test('converts arrays of objects', () => {
      const result = normalizeResponseKeys([{ file_id: 1 }, { file_id: 2 }]);
      expect(result).toEqual([{ fileId: 1 }, { fileId: 2 }]);
    });

    test('returns primitives unchanged', () => {
      expect(normalizeResponseKeys('text')).toBe('text');
      expect(normalizeResponseKeys(0)).toBe(0);
    });
  });

  describe('middleware integration', () => {
    test('normalizeRequestKeys mutates req.body and req.query, then calls next', () => {
      const next = jest.fn();
      const req = {
        body: { group_id: 1 },
        query: { page_size: 10 },
      };

      normalizeRequestKeys(req, {}, next);

      expect(req.body).toEqual({ groupId: 1 });
      expect(req.query).toEqual({ pageSize: 10 });
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('normalizeRequestKeys does not crash on missing body/query', () => {
      const next = jest.fn();
      const req = {};

      expect(() => normalizeRequestKeys(req, {}, next)).not.toThrow();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
