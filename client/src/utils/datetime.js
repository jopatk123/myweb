export function formatDateTime(value, locale = 'zh-CN', options = {}) {
  if (!value) return '';
  try {
    const date =
      typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : value;
    if (Number.isNaN(date?.getTime?.())) return '';
    return date.toLocaleString(locale, {
      hour12: false,
      ...options,
    });
  } catch {
    return '';
  }
}

// SQLite CURRENT_TIMESTAMP 产出的 'YYYY-MM-DD HH:MM:SS' 是 UTC 时间
// 且无时区标记，直接 new Date() 在部分环境（如 Safari）会得到 Invalid Date，
// 或被误当作本地时间解析。
const SQLITE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function parseServerDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && SQLITE_DATETIME_PATTERN.test(value)) {
    const date = new Date(`${value.replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 相对日期文案：今天 / 昨天 / N 天前 / 具体日期（超过 7 天）。
 * 按自然日（本地时区）计算差值，无效输入返回空字符串。
 */
export function formatRelativeDate(value, locale = 'zh-CN') {
  const date = parseServerDate(value);
  if (!date) return '';

  const now = new Date();
  const startOfDay = d =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays > 1 && diffDays <= 7) return `${diffDays}天前`;
  if (diffDays < 0) {
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}
