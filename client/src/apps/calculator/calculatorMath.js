/** IEEE-754 二进制浮点大约能稳定表示 15 位有效数字。 */
export const MAX_INPUT_DIGITS = 15;

export function countDigits(input) {
  const unsigned = String(input).replace(/^-/, '').replace('.', '');
  const stripped = unsigned.replace(/^0+(?=\d)/, '');
  return stripped.length;
}

export function canAppendDigit(display, digit, waitingForOperand) {
  const next =
    waitingForOperand || display === '0' ? String(digit) : `${display}${digit}`;
  return countDigits(next) <= MAX_INPUT_DIGITS;
}

export function parseDisplay(display) {
  if (
    display === '' ||
    display === '-' ||
    display === '.' ||
    display === '-.'
  ) {
    return 0;
  }
  const value = Number(display);
  return Number.isFinite(value) ? value : 0;
}

/**
 * 将 IEEE 结果格式化为最多 15 位有效数字的展示字符串。
 * 这是二进制浮点的真实有效精度，而不是额外截断到固定小数位。
 */
export function formatNumber(value) {
  if (!Number.isFinite(value)) return null;
  const normalized = Number(value.toPrecision(MAX_INPUT_DIGITS));
  if (Object.is(normalized, -0)) return '0';
  return String(normalized);
}

export function parsePastedNumber(text) {
  const trimmed = String(text ?? '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  if (countDigits(trimmed) > MAX_INPUT_DIGITS) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;

  const isIntegerInput = !trimmed.includes('.');
  if (isIntegerInput && !Number.isSafeInteger(value)) return null;

  const display = isIntegerInput ? String(value) : trimmed;
  if (countDigits(display) > MAX_INPUT_DIGITS) return null;

  return { value, display };
}

export function performCalculation(a, b, op) {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
    case '%':
      return a % b;
    default:
      return b;
  }
}

export function isEditableElement(el) {
  if (!el || el === document.body || el === document.documentElement) {
    return false;
  }
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(el.isContentEditable);
}
