import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { createApp } from '../src/appFactory.js';

/**
 * OpenAPI 契约一致性测试：
 * 解析 openapi.yaml（含 ./openapi/paths/*.yaml 的 $ref），得到「文档化的路由表」；
 * 再遍历 createApp() 生成的 Express 路由表，得到「实现的路由表」，
 * 双向差集比对 —— 新增路由未文档化、文档化路由被删除，都会导致测试失败。
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.join(__dirname, '..');

const OPERATION_METHODS = ['get', 'post', 'put', 'delete', 'patch'];

// 有意不纳入 OpenAPI 文档的基础设施路由
const UNDOCUMENTED_OPERATIONS = new Set([
  'GET /api', // 仅非生产环境存在的 API 导航端点
  'GET /health', // 存活探针
  'GET /*', // SPA fallback
]);

async function loadDocument(relativePath) {
  const raw = await fs.readFile(path.join(SERVER_ROOT, relativePath), 'utf8');
  return YAML.parse(raw);
}

function resolveRefFragment(document, fragment) {
  const pointer = String(fragment || '')
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean);
  let node = document;
  for (const seg of pointer) node = node?.[seg];
  if (!node) {
    throw new Error(`Unresolvable OpenAPI $ref fragment: #${fragment}`);
  }
  return node;
}

async function loadDocumentedOperations() {
  const root = await loadDocument('openapi.yaml');
  const documented = new Map(); // path -> Set<method>

  for (const [pathKey, pathItem] of Object.entries(root.paths || {})) {
    if (!pathItem || typeof pathItem !== 'object' || !pathItem.$ref) {
      throw new Error(
        `openapi.yaml 中的路径 ${pathKey} 必须通过 $ref 指向 paths 分片文件`
      );
    }
    const [fileRef, fragment] = String(pathItem.$ref).split('#');
    const doc = await loadDocument(fileRef);
    const pathLevelItem = resolveRefFragment(doc, fragment);
    const methods = OPERATION_METHODS.filter(m => pathLevelItem[m]);
    if (methods.length > 0) {
      documented.set(pathKey, new Set(methods));
    }
  }
  return documented;
}

// ─── Express 路由表收集 ───────────────────────────────────────────────────────

function mountPrefixFromLayer(layer) {
  if (layer.regexp?.fast_slash) return '';
  let src = layer.regexp?.source || '';
  src = src.replace(/^\^/, '');
  src = src.replace(/\\(.)/g, '$1'); // unescape，如 \/ -> /
  src = src.replace(/\(\?=\/\|\$\)/g, ''); // 去掉 end:false 的前瞻
  src = src.replace(/\/\?$/, ''); // 去掉非严格模式下的可选斜杠
  return src;
}

function joinPath(prefix, routePath) {
  let s = `/${prefix.replace(/^\/+|\/+$/g, '')}/${String(routePath).replace(
    /^\/+/,
    ''
  )}`;
  s = s.replace(/\/+/g, '/');
  // 去掉尾斜杠（根路由 '/' 挂载在 '/api/xxx' 下时应为 '/api/xxx'）
  return s.length > 1 ? s.replace(/\/$/, '') : s;
}

function normalizeRoutePath(routePath) {
  let s = String(routePath);
  s = s.replace(/\\(.)/g, '$1');
  s = s.replace(/\([^)]*\)/g, ''); // 丢弃内联正则约束：/:id(\d+) -> /:id
  s = s.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  return s === '*' ? '/*' : s;
}

function collectExpressRoutes(app) {
  const found = new Set(); // "METHOD /path"
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        const fullPath = joinPath(prefix, normalizeRoutePath(layer.route.path));
        for (const method of Object.keys(layer.route.methods || {})) {
          if (layer.route.methods[method]) {
            found.add(`${method.toUpperCase()} ${fullPath}`);
          }
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        walk(layer.handle.stack, prefix + mountPrefixFromLayer(layer));
      }
    }
  };
  walk(app._router.stack, '');
  return found;
}

function operationsToSet(operationsMap) {
  const set = new Set();
  for (const [p, methods] of operationsMap) {
    for (const m of methods) set.add(`${m.toUpperCase()} ${p}`);
  }
  return set;
}

describe('OpenAPI contract: documented operations match implemented routes', () => {
  let app;
  let db;
  let documented;
  let implemented;

  beforeAll(async () => {
    ({ app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
    }));
    documented = await loadDocumentedOperations();
    implemented = collectExpressRoutes(app);
  });

  afterAll(async () => {
    await db?.close?.();
  });

  test('every documented operation is implemented', () => {
    const missing = [...operationsToSet(documented)].filter(
      op => !implemented.has(op) && !UNDOCUMENTED_OPERATIONS.has(op)
    );
    expect(missing).toEqual([]);
  });

  test('every implemented /api|/internal route is documented', () => {
    const undocumented = [...implemented]
      .filter(op => /^\/(api|internal)\//.test(op))
      .filter(op => !documented.has(op.split(' ')[1]))
      .filter(op => !UNDOCUMENTED_OPERATIONS.has(op));
    expect(undocumented).toEqual([]);
  });

  test('method sets match exactly for each documented path', () => {
    const actual = new Map();
    for (const op of implemented) {
      const [method, p] = op.split(' ');
      if (UNDOCUMENTED_OPERATIONS.has(op)) continue;
      if (!documented.has(p)) continue;
      if (!actual.has(p)) actual.set(p, new Set());
      actual.get(p).add(method);
    }

    for (const [p, expectedMethods] of documented) {
      const actualMethods = actual.get(p) || new Set();
      expect([...actualMethods].sort()).toEqual(
        [...expectedMethods].map(m => m.toUpperCase()).sort()
      );
    }
  });

  test('documents application session security requirements', async () => {
    const root = await loadDocument('openapi.yaml');
    expect(root.components?.securitySchemes?.appSession?.name).toBe(
      'myweb_auth'
    );
    expect(root.components?.securitySchemes?.agentBearer?.scheme).toBe(
      'bearer'
    );
    expect(root.security).toEqual([{ appSession: [] }, { agentBearer: [] }]);
  });
});
