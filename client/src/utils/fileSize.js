const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatFileSize(bytes, decimals = 1, options = {}) {
  const { invalidValue = '0 B', formatter } = options;
  const numeric = Number(bytes);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return invalidValue;
  }

  if (numeric === 0) {
    return '0 B';
  }

  const base = 1024;
  const unitIndex = Math.min(
    FILE_SIZE_UNITS.length - 1,
    Math.floor(Math.log(numeric) / Math.log(base))
  );
  const value = numeric / Math.pow(base, unitIndex);
  const unit = FILE_SIZE_UNITS[unitIndex];

  if (typeof formatter === 'function') {
    return formatter({
      bytes: numeric,
      value,
      unit,
      unitIndex,
      decimals,
    });
  }

  return `${parseFloat(value.toFixed(decimals))} ${unit}`;
}
