import { describe, expect, it } from 'vitest';
import {
  appendDecimal,
  appendDigit,
  backspaceOperand,
  canAppendDigit,
  countDigits,
  formatNumber,
  isPlainEditableOperand,
  parseDisplay,
  parsePastedNumber,
  performCalculation,
} from '@/apps/calculator/calculatorMath.js';

describe('calculatorMath', () => {
  it('counts digits without the sign or decimal point', () => {
    expect(countDigits('0.1')).toBe(1);
    expect(countDigits('-12.05')).toBe(4);
    expect(countDigits('999999999999999')).toBe(15);
  });

  it('does not count exponent markers as digits', () => {
    expect(countDigits('1e-7')).toBe(1);
    expect(countDigits('1.23e+21')).toBe(3);
    expect(countDigits('-4.5E-10')).toBe(2);
  });

  it('rejects a 16th typed digit', () => {
    expect(canAppendDigit('9'.repeat(15), '9', false)).toBe(false);
    expect(canAppendDigit('9'.repeat(15), '9', true)).toBe(true);
  });

  it('treats scientific notation as a new operand instead of appending', () => {
    expect(isPlainEditableOperand('1e-7')).toBe(false);
    expect(appendDigit('1e-7', '9', false)).toBe('9');
    expect(appendDigit('1e+21', '2', true)).toBe('2');
  });

  it('formats binary float noise using 15 significant digits', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber((1 / 3) * 3)).toBe('1');
    expect(formatNumber(0.1 * 0.1)).toBe('0.01');
    expect(formatNumber(1e-7)).toBe('1e-7');
    expect(formatNumber(1e21)).toBe('1e+21');
  });

  it('keeps full IEEE values for chained division', () => {
    const third = performCalculation(1, 3, '/');
    expect(performCalculation(third, 3, '*')).toBe(1);
  });

  it('does not coerce illegal fragments to 0', () => {
    expect(parseDisplay('1e-')).toBeNull();
    expect(parseDisplay('1e-7.')).toBeNull();
    expect(parseDisplay('-')).toBeNull();
    expect(parseDisplay('')).toBeNull();
    expect(parseDisplay('0.')).toBe(0);
    expect(parseDisplay('1e-7')).toBe(1e-7);
  });

  it('backspaces plain numbers but resets scientific and stray minus', () => {
    expect(backspaceOperand('16')).toBe('1');
    expect(backspaceOperand('1')).toBe('0');
    expect(backspaceOperand('-1')).toBe('0');
    expect(backspaceOperand('-12')).toBe('-1');
    expect(backspaceOperand('1e-7')).toBe('0');
    expect(backspaceOperand('1e+21')).toBe('0');
    expect(backspaceOperand('0.')).toBe('0');
  });

  it('starts a new 0. instead of tacking a dot onto scientific notation', () => {
    expect(appendDecimal('1e-7', false)).toBe('0.');
    expect(appendDecimal('5', false)).toBe('5.');
    expect(appendDecimal('5.', false)).toBe('5.');
    expect(appendDecimal('8', true)).toBe('0.');
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
