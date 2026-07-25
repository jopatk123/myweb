import { mapToSnake } from '../../src/utils/field-mapper.js';

describe('field-mapper', () => {
  describe('mapToSnake', () => {
    test('converts top-level camelCase keys to snake_case', () => {
      expect(mapToSnake({ groupId: 1, isAutostart: true })).toEqual({
        group_id: 1,
        is_autostart: true,
      });
    });

    test('recursively converts nested objects', () => {
      const result = mapToSnake({
        outerId: 1,
        nested: { innerValue: 'x' },
      });
      expect(result).toEqual({
        outer_id: 1,
        nested: { inner_value: 'x' },
      });
    });

    test('recursively converts arrays of objects', () => {
      const result = mapToSnake([{ itemId: 1 }, { itemId: 2 }]);
      expect(result).toEqual([{ item_id: 1 }, { item_id: 2 }]);
    });

    test('preserves arrays of primitives unchanged', () => {
      const result = mapToSnake({ ids: [1, 2, 3] });
      expect(result).toEqual({ ids: [1, 2, 3] });
    });

    test('returns primitive values unchanged', () => {
      expect(mapToSnake('string')).toBe('string');
      expect(mapToSnake(42)).toBe(42);
      expect(mapToSnake(null)).toBe(null);
    });

    test('returns empty object for empty object input', () => {
      expect(mapToSnake({})).toEqual({});
    });

    test('handles already snake_case keys without double-underscore', () => {
      // snake_case keys pass through camelToSnake unchanged (no uppercase to convert)
      expect(mapToSnake({ already_snake: 1 })).toEqual({ already_snake: 1 });
    });

    test('handles null/undefined values in object fields', () => {
      const result = mapToSnake({ groupId: null, name: undefined });
      expect(result).toEqual({ group_id: null, name: undefined });
    });
  });
});
