import {
  parseEnvNumber,
  parseEnvBoolean,
  parseByteSize,
  parseEnvByteSize,
} from '../../src/utils/env.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  Object.keys(process.env).forEach(key => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('parseEnvNumber()', () => {
  test('returns parsed number when env var is a valid integer string', () => {
    process.env._TEST_NUM = '42';
    expect(parseEnvNumber('_TEST_NUM', 0)).toBe(42);
  });

  test('returns defaultValue when env var is not set', () => {
    delete process.env._TEST_NUM;
    expect(parseEnvNumber('_TEST_NUM', 99)).toBe(99);
  });

  test('returns defaultValue when env var is a non-numeric string', () => {
    process.env._TEST_NUM = 'abc';
    expect(parseEnvNumber('_TEST_NUM', 7)).toBe(7);
  });

  test('returns defaultValue when env var is empty string', () => {
    process.env._TEST_NUM = '';
    expect(parseEnvNumber('_TEST_NUM', 5)).toBe(5);
  });
});

describe('parseEnvBoolean()', () => {
  test('returns true for truthy string values', () => {
    for (const val of ['1', 'true', 'yes', 'y', 'on', 'TRUE', 'YES']) {
      process.env._TEST_BOOL = val;
      expect(parseEnvBoolean('_TEST_BOOL', false)).toBe(true);
    }
  });

  test('returns false for falsy string values', () => {
    for (const val of ['0', 'false', 'no', 'n', 'off', 'FALSE', 'NO']) {
      process.env._TEST_BOOL = val;
      expect(parseEnvBoolean('_TEST_BOOL', true)).toBe(false);
    }
  });

  test('returns defaultValue when env var is not set', () => {
    delete process.env._TEST_BOOL;
    expect(parseEnvBoolean('_TEST_BOOL', true)).toBe(true);
    expect(parseEnvBoolean('_TEST_BOOL', false)).toBe(false);
  });

  test('returns defaultValue for unknown string', () => {
    process.env._TEST_BOOL = 'maybe';
    expect(parseEnvBoolean('_TEST_BOOL', true)).toBe(true);
  });
});

describe('parseByteSize()', () => {
  test('returns defaultValue for undefined', () => {
    expect(parseByteSize(undefined, 1024)).toBe(1024);
  });

  test('returns defaultValue for null', () => {
    expect(parseByteSize(null, 512)).toBe(512);
  });

  test('returns defaultValue for empty string', () => {
    expect(parseByteSize('', 256)).toBe(256);
  });

  test('returns number directly when value is a finite number', () => {
    expect(parseByteSize(2048, 0)).toBe(2048);
    expect(parseByteSize(0, 999)).toBe(0);
  });

  test('parses plain byte count string', () => {
    expect(parseByteSize('1024', 0)).toBe(1024);
  });

  test('parses kb/mb/gb units', () => {
    expect(parseByteSize('1kb', 0)).toBe(1024);
    expect(parseByteSize('2mb', 0)).toBe(2 * 1024 * 1024);
    expect(parseByteSize('1gb', 0)).toBe(1024 * 1024 * 1024);
  });

  test('returns defaultValue for string with no regex match', () => {
    expect(parseByteSize('not-a-size!@#', 99)).toBe(99);
  });

  test('returns defaultValue for unknown unit', () => {
    expect(parseByteSize('100xyz', 77)).toBe(77);
  });

  test('handles decimal values', () => {
    expect(parseByteSize('1.5mb', 0)).toBe(Math.round(1.5 * 1024 * 1024));
  });
});

describe('parseEnvByteSize()', () => {
  test('returns parsed value from env var', () => {
    process.env._TEST_BYTES = '4mb';
    expect(parseEnvByteSize('_TEST_BYTES', 0)).toBe(4 * 1024 * 1024);
  });

  test('returns defaultValue when env var is not set', () => {
    delete process.env._TEST_BYTES;
    expect(parseEnvByteSize('_TEST_BYTES', 8192)).toBe(8192);
  });
});
