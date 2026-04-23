import {
  verifyToken,
  hashToken,
  constantTimeEquals,
} from '../../src/utils/crypto.js';

describe('constantTimeEquals', () => {
  test('returns true for identical strings', () => {
    expect(constantTimeEquals('abc', 'abc')).toBe(true);
  });

  test('returns false for strings of different length', () => {
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
  });

  test('returns false for same-length different strings', () => {
    expect(constantTimeEquals('abc', 'xyz')).toBe(false);
  });
});

describe('hashToken', () => {
  test('returns sha256: prefixed hex string', () => {
    const result = hashToken('secret');
    expect(result).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test('produces deterministic output', () => {
    expect(hashToken('mysecret')).toBe(hashToken('mysecret'));
  });

  test('produces different output for different inputs', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('verifyToken', () => {
  test('returns false when expected is empty string (fail-closed)', () => {
    expect(verifyToken('', 'anytoken')).toBe(false);
  });

  test('returns false when expected is whitespace only (fail-closed)', () => {
    expect(verifyToken('   ', 'anytoken')).toBe(false);
  });

  test('returns false when provided is empty', () => {
    expect(verifyToken('secret', '')).toBe(false);
  });

  test('returns false when both are empty', () => {
    expect(verifyToken('', '')).toBe(false);
  });

  test('returns true for matching plaintext tokens', () => {
    expect(verifyToken('mysecret', 'mysecret')).toBe(true);
  });

  test('returns false for non-matching plaintext tokens', () => {
    expect(verifyToken('mysecret', 'wrong')).toBe(false);
  });

  test('returns false for tokens that differ only in case', () => {
    expect(verifyToken('Secret', 'secret')).toBe(false);
  });

  test('trims whitespace from both sides before comparing', () => {
    expect(verifyToken('  secret  ', '  secret  ')).toBe(true);
    expect(verifyToken('secret', '  secret  ')).toBe(true);
  });

  test('returns true when expected is sha256 hash and provided plaintext matches', () => {
    const hash = hashToken('plaintext');
    expect(verifyToken(hash, 'plaintext')).toBe(true);
  });

  test('returns false when expected is sha256 hash and provided plaintext does not match', () => {
    const hash = hashToken('plaintext');
    expect(verifyToken(hash, 'wrong')).toBe(false);
  });
});
