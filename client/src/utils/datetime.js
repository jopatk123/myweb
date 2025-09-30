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
