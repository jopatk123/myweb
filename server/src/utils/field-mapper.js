import { camelToSnake } from './case-helper.js';

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// 将对象的键从 camelCase 转为 snake_case（递归）
export function mapToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(mapToSnake);
  if (!isPlainObject(obj)) return obj;
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = camelToSnake(k);
    res[nk] = mapToSnake(v);
  }
  return res;
}

export default { mapToSnake };
