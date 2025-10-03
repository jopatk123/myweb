const UNIT_FACTORS = {
  b: 1,
  byte: 1,
  bytes: 1,
  k: 1024,
  kb: 1024,
  kib: 1024,
  m: 1024 * 1024,
  mb: 1024 * 1024,
  mib: 1024 * 1024,
  g: 1024 * 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  gib: 1024 * 1024 * 1024,
  t: 1024 * 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024,
  tib: 1024 * 1024 * 1024 * 1024,
};

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const str = String(value ?? '').trim();
  if (!str) return undefined;

  if (/^\d+$/.test(str)) {
    const num = Number(str);
    return Number.isFinite(num) ? num : undefined;
  }

  return undefined;
}

export function parseEnvNumber(name, defaultValue) {
  const value = process.env[name];
  const num = toNumber(value);
  if (num === undefined) return defaultValue;
  return num;
}

export function parseEnvBoolean(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const str = String(value).toLowerCase().trim();
  if (['1', 'true', 'yes', 'y', 'on'].includes(str)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(str)) return false;
  return defaultValue;
}

export function parseByteSize(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const str = String(value).trim().toLowerCase();
  if (!str) return defaultValue;

  const match = str.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-z]*)$/);
  if (!match) {
    return defaultValue;
  }

  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) {
    return defaultValue;
  }

  const unitKey = match[2] || 'b';
  const factor = UNIT_FACTORS[unitKey] ?? UNIT_FACTORS[`${unitKey}b`];
  if (!factor) {
    return defaultValue;
  }

  return Math.round(numeric * factor);
}

export function parseEnvByteSize(name, defaultValue) {
  const value = process.env[name];
  return parseByteSize(value, defaultValue);
}
