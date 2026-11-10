import { describe, expect, it } from 'vitest';
import {
  canAppendDigit,
  countDigits,
  formatNumber,
  parsePastedNumber,
  performCalculation,
} from '@/apps/calculator/calculatorMath.js';

describe('calculatorMath', () => {
  it('counts digits without the sign or decimal point', () => {
    expect(countDigits('0.1')).toBe(1);
    expect(countDigits('-12.05')).toBe(4);
    expect(countDigits('999999999999999')).toBe(15);
  });

  it('rejects a 16th typed digit', () => {
    expect(canAppendDigit('9'.repeat(15), '9', false)).toBe(false);
    expect(canAppendDigit('9'.repeat(15), '9', true)).toBe(true);
  });

  it('formats binary float noise using 15 significant digits', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber((1 / 3) * 3)).toBe('1');
    expect(formatNumber(0.1 * 0.1)).toBe('0.01');
  });

  it('keeps full IEEE values for chained division', () => {
    const third = performCalculation(1, 3, '/');
    expect(performCalculation(third, 3, '*')).toBe(1);
  });

  it('accepts safe pasted integers and rejects overflowed integers', () => {
    expect(parsePastedNumber(' 42 ')).toEqual({ value: 42, display: '42' });
    expect(parsePastedNumber('-3.5')).toEqual({ value: -3.5, display: '-3.5' });
    expect(parsePastedNumber('9'.repeat(16))).toBeNull();
    expect(parsePastedNumber('1e10')).toBeNull();
    expect(parsePastedNumber('3.')).toBeNull();
    expect(parsePastedNumber('abc')).toBeNull();
  });
});
