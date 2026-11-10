/** IEEE-754 二进制浮点大约能稳定表示 15 位有效数字。 */
export const MAX_INPUT_DIGITS = 15;

/** 可按字符编辑的十进制操作数：可选负号、数字、至多一个小数点，不含指数。 */
const PLAIN_OPERAND = /^-?(?:\d+\.?\d*|\.\d+)$/;

export function isPlainEditableOperand(display) {
  const text = String(display);
  if (/[eE]/.test(text)) return false;
  return PLAIN_OPERAND.test(text);
}

export function countDigits(input) {
  const significand = String(input).split(/[eE]/)[0];
  const unsigned = significand.replace(/^-/, '').replace('.', '');
  const stripped = unsigned.replace(/^0+(?=\d)/, '');
  return stripped.length;
}

function nextDigitDisplay(display, digit, waitingForOperand) {
  if (
    waitingForOperand ||
    !isPlainEditableOperand(display) ||
    display === '0' ||
    display === '-0'
  ) {
    return String(digit);
  }
  return `${display}${digit}`;
}

export function canAppendDigit(display, digit, waitingForOperand) {
  const next = nextDigitDisplay(display, digit, waitingForOperand);
  return isPlainEditableOperand(next) && countDigits(next) <= MAX_INPUT_DIGITS;
}

export function appendDigit(display, digit, waitingForOperand) {
  if (!canAppendDigit(display, digit, waitingForOperand)) return null;
  return nextDigitDisplay(display, digit, waitingForOperand);
}

export function parseDisplay(display) {
  const text = String(display);
  if (
    text === '' ||
    text === '-' ||
    text === '.' ||
    text === '-.' ||
    text.endsWith('e') ||
    text.endsWith('E') ||
    text.endsWith('e-') ||
    text.endsWith('E-') ||
    text.endsWith('e+') ||
    text.endsWith('E+')
  ) {
    return null;
  }

  if (
    !isPlainEditableOperand(text) &&
    !/^-?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(text)
  ) {
    return null;
  }

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function backspaceOperand(display) {
  const text = String(display);
  if (!isPlainEditableOperand(text)) {
    return '0';
  }
  if (text.length <= 1 || text === '-0') {
    return '0';
  }
  const next = text.slice(0, -1);
  if (
    next === '-' ||
    !isPlainEditableOperand(next) ||
    parseDisplay(next) === null
  ) {
    return '0';
  }
  return next;
}

export function appendDecimal(display, waitingForOperand) {
  if (waitingForOperand || !isPlainEditableOperand(display)) {
    return '0.';
  }
  if (display.includes('.')) return display;
  const next = `${display}.`;
  return isPlainEditableOperand(next) ? next : display;
}

/**
 * 将 IEEE 结果格式化为最多 15 位有效数字的展示字符串。
 * 这是二进制浮点的真实有效精度，而不是额外截断到固定小数位。
 * 极小/极大值可能为科学计数法；该形式只用于展示，不能按字符编辑。
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
  if (!isPlainEditableOperand(display)) return null;
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
