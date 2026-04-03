import { timingSafeEqual, createHash } from 'crypto';

/**
 * 时序安全的字符串比较，防止时序攻击。
 * 两个字符串长度不同时也会消耗固定时间。
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function constantTimeEquals(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA); // 消耗固定时间
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * 对 token 字符串进行 sha256 哈希，返回 "sha256:<hex>" 格式。
 * @param {string} token
 * @returns {string}
 */
export function hashToken(token) {
  return `sha256:${createHash('sha256').update(String(token)).digest('hex')}`;
}

/**
 * 验证提供的 token 与期望值是否相符。
 * 期望值可以是明文或 "sha256:<hex>" 格式。
 * @param {string} expected
 * @param {string} provided
 * @returns {boolean}
 */
export function verifyToken(expected, provided) {
  const safeExpected = (expected || '').trim();
  const safeProvided = (provided || '').trim();

  if (!safeExpected) return true;
  if (!safeProvided) return false;

  if (safeExpected.startsWith('sha256:')) {
    return constantTimeEquals(hashToken(safeProvided), safeExpected);
  }

  return constantTimeEquals(safeExpected, safeProvided);
}
