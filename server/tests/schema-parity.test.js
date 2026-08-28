import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { initDatabase } from '../src/config/database.js';

/**
 * Schema 双源一致性测试：
 * - 生产形态：文件库经 knex migrations（src/migrations/*）构建
 * - 测试形态：:memory: 库经 schema DDL（src/db/schema/*）构建
 * 两者必须产出一致的表与列结构，否则测试库无法代表生产库，
 * 结构漂移也无法被任何测试拦截。
 *
 * 比较范围：表集合 + 每张表的列（名称/类型/NOT NULL/主键/默认值）。
 * 不比较：索引、触发器、FTS 影子表（两种来源的创建方式本就不同）。
 */

const FTS_SHADOW_SUFFIXES = [
  '_data',
  '_idx',
  '_content',
  '_docsize',
  '_config',
];

function isInternalTable(name) {
  if (name.startsWith('sqlite_') || name.startsWith('knex_')) return true;
  if (name.includes('_fts')) {
    if (name.endsWith('_fts')) return false; // FTS 虚拟表本身仍参与比较
    return FTS_SHADOW_SUFFIXES.some(suffix => name.endsWith(suffix));
  }
  return false;
}

function listTables(db) {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    )
    .all();
  return rows.map(r => r.name).filter(name => !isInternalTable(name));
}

function describeTable(db, table) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const map = {};
  for (const col of columns) {
    map[col.name] = {
      type: String(col.type || '').toUpperCase(),
      notnull: Boolean(col.notnull),
      pk: Boolean(col.pk),
      // 默认值统一为字符串比较（如 CURRENT_TIMESTAMP / '0' / NULL）
      dflt: col.dflt_value === null ? null : String(col.dflt_value),
    };
  }
  return map;
}

function diffSchemas(productionTables, testTables) {
  const problems = [];
  const allTables = [
    ...new Set([...Object.keys(productionTables), ...Object.keys(testTables)]),
  ].sort();

  for (const table of allTables) {
    const inProduction = productionTables[table];
    const inTest = testTables[table];

    if (!inProduction) {
      problems.push(
        `表 ${table} 仅存在于测试 schema（db/schema），生产迁移缺失`
      );
      continue;
    }
    if (!inTest) {
      problems.push(
        `表 ${table} 仅存在于生产迁移（migrations），测试 schema 缺失`
      );
      continue;
    }

    const allColumns = [
      ...new Set([...Object.keys(inProduction), ...Object.keys(inTest)]),
    ];
    for (const col of allColumns) {
      const prod = inProduction[col];
      const test = inTest[col];
      if (!prod) {
        problems.push(`表 ${table} 列 ${col} 仅存在于测试 schema`);
      } else if (!test) {
        problems.push(`表 ${table} 列 ${col} 仅存在于生产迁移`);
      } else if (
        prod.type !== test.type ||
        prod.notnull !== test.notnull ||
        prod.pk !== test.pk ||
        prod.dflt !== test.dflt
      ) {
        problems.push(
          `表 ${table} 列 ${col} 定义不一致：production=${JSON.stringify(prod)} test=${JSON.stringify(test)}`
        );
      }
    }
  }
  return problems;
}

describe('schema parity: migrations vs schema DDL', () => {
  let tmpFile;
  let fileDb;
  let memDb;

  beforeAll(async () => {
    tmpFile = path.join(
      os.tmpdir(),
      `myweb-schema-parity-${Date.now()}-${process.pid}.db`
    );
    fileDb = await initDatabase({
      dbPath: tmpFile,
      seedBuiltinApps: false,
      silent: true,
    });
    memDb = await initDatabase({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silent: true,
    });
  });

  afterAll(async () => {
    fileDb?.close?.();
    memDb?.close?.();
    if (tmpFile) {
      await fs.rm(tmpFile, { force: true });
      await fs.rm(`${tmpFile}-shm`, { force: true });
      await fs.rm(`${tmpFile}-wal`, { force: true });
    }
  });

  test('both DDL sources produce identical table and column structures', () => {
    const productionTables = {};
    for (const table of listTables(fileDb)) {
      productionTables[table] = describeTable(fileDb, table);
    }

    const testTables = {};
    for (const table of listTables(memDb)) {
      testTables[table] = describeTable(memDb, table);
    }

    expect(diffSchemas(productionTables, testTables)).toEqual([]);
  });
});
