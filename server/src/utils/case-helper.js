// 将 camelCase 键转换为 snake_case 的工具
export function camelToSnake(str) {
  return String(str)
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase();
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

export function normalizeKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys);
  }
  if (!isPlainObject(obj)) return obj;

  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    // 默认将键从 snake_case 转为 camelCase，适配推荐 A（后端内部使用 camelCase）
    const nk = snakeToCamel(k);
    res[nk] = normalizeKeys(v);
  }
  return res;
}

// express 中间件：归一化 req.body 与 req.query 的键名（仅对对象生效）
export function normalizeRequestKeys(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = normalizeKeys(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = normalizeKeys(req.query);
    }
  } catch (e) {
    // 归一化失败时不阻塞请求
    console.warn('normalizeRequestKeys warning:', e?.message || e);
  }
  next();
}

// 将 snake_case 转回 camelCase（用于对外输出）
export function snakeToCamel(str) {
  return String(str).replace(/_([a-z])/g, (_, g) => g.toUpperCase());
}

export function normalizeResponseKeys(obj) {
  if (Array.isArray(obj)) return obj.map(normalizeResponseKeys);
  if (!isPlainObject(obj)) return obj;
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = snakeToCamel(k);
    res[nk] = normalizeResponseKeys(v);
  }
  return res;
}

// 中间件：包装 res.json，将响应体中的 data 字段（若为对象或数组）转换为 camelCase 键
export function normalizeResponseMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = body => {
    try {
      if (body && typeof body === 'object' && body.data !== undefined) {
        const d = body.data;
        if (Array.isArray(d) || (d && typeof d === 'object')) {
          body.data = normalizeResponseKeys(d);
        }
      }
    } catch (e) {
      console.warn('normalizeResponseMiddleware warning:', e?.message || e);
    }
    return originalJson(body);
  };
  next();
}
