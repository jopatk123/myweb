import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempRoot = path.join(__dirname, '../tmp-database-config');

beforeEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

afterAll(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe('config/database - initDatabase', () => {
  test('initializes in-memory database without running migrations', async () => {
    const db = await initDatabase({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silent: true,
    });

    const appTable = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='apps'"
      )
      .get();

    expect(appTable?.name).toBe('apps');
    db.close();
  });

  test('initializes file database and creates missing data directory', async () => {
    const dbPath = path.join(tempRoot, 'nested', 'myweb-test.db');

    const db = await initDatabase({
      dbPath,
      seedBuiltinApps: false,
      silent: true,
    });

    const stat = await fs.stat(dbPath);
    expect(stat.isFile()).toBe(true);

    const migrationTable = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='knex_migrations'"
      )
      .get();
    expect(migrationTable?.name).toBe('knex_migrations');

    db.close();
  });

  test('seeds builtin apps when seedBuiltinApps=true', async () => {
    const db = await initDatabase({
      dbPath: ':memory:',
      seedBuiltinApps: true,
      silent: false,
    });

    const builtinCount = db
      .prepare(
        'SELECT COUNT(1) AS c FROM apps WHERE is_builtin = 1 AND is_deleted = 0'
      )
      .get();

    expect(builtinCount.c).toBeGreaterThan(0);
    db.close();
  });
});
