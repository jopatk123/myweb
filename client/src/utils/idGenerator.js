/**
 * 生成唯一的ID
 * 基于时间戳和随机数生成，确保唯一性
 * @returns {string} 生成的唯一ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
