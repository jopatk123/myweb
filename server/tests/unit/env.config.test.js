import { jest } from '@jest/globals';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  Object.keys(process.env).forEach(key => {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, ORIGINAL_ENV);
}

async function loadEnvModule() {
  jest.resetModules();
  return import('../../src/config/env.js');
}

describe('config/env', () => {
  afterEach(() => {
    restoreEnv();
    jest.resetModules();
  });

  test('uses sensible defaults when not configured', async () => {
    delete process.env.CORS_ORIGIN;
    delete process.env.DB_PATH;

    const { appEnv, isCorsOriginAllowed, resolveDatabasePath } =
      await loadEnvModule();

    expect(appEnv.cors.allowAll).toBe(false);
    expect(appEnv.cors.effective).toContain('http://localhost:3000');
    expect(isCorsOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isCorsOriginAllowed('http://evil.com')).toBe(false);

    const resolvedDbPath = resolveDatabasePath();
    expect(resolvedDbPath).toBe(appEnv.database.defaultFile);
    expect(path.isAbsolute(resolvedDbPath)).toBe(true);
  });

  test('respects wildcard CORS configuration', async () => {
    process.env.CORS_ORIGIN = '*';

    const { appEnv, isCorsOriginAllowed, getCorsEffectiveOrigins } =
      await loadEnvModule();

    expect(appEnv.cors.allowAll).toBe(true);
    expect(isCorsOriginAllowed('http://anywhere.test')).toBe(true);
    expect(getCorsEffectiveOrigins()).toEqual(['*']);
  });

  test('falls back to development when NODE_ENV is undefined', async () => {
    delete process.env.NODE_ENV;

    const { appEnv } = await loadEnvModule();

    expect(appEnv.nodeEnv).toBe('development');
    expect(appEnv.isDevelopment).toBe(true);
  });

  test('applies database path override helper', async () => {
    const overridePath = '/tmp/myweb-test.db';

    const { resolveDatabasePath, applyDatabasePathOverride } =
      await loadEnvModule();

    expect(resolveDatabasePath(overridePath)).toBe(overridePath);

    applyDatabasePathOverride(overridePath);
    expect(process.env.DB_PATH).toBe(overridePath);
  });

  test('loadEnvFile reads dotenv values without overriding existing vars', async () => {
    const { loadEnvFile } = await import('../../src/config/dotenv.js');
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'myweb-dotenv-'));
    const envPath = path.join(tempDir, '.env');

    process.env.EXISTING_TOKEN = 'from-process';
    await fs.writeFile(
      envPath,
      'CORS_ORIGIN=http://example.com\nEXISTING_TOKEN=file-value\n'
    );

    const loadedCount = loadEnvFile(envPath);

    expect(loadedCount).toBe(1);
    expect(process.env.CORS_ORIGIN).toBe('http://example.com');
    expect(process.env.EXISTING_TOKEN).toBe('from-process');
  });

  test('supports explicit CORS origin list and effective origins helper', async () => {
    process.env.CORS_ORIGIN = 'http://example.com, http://foo.test';

    const { appEnv, isCorsOriginAllowed, getCorsEffectiveOrigins } =
      await loadEnvModule();

    expect(appEnv.cors.allowAll).toBe(false);
    expect(isCorsOriginAllowed('http://example.com')).toBe(true);
    expect(isCorsOriginAllowed('http://not-allowed.test')).toBe(false);
    expect(getCorsEffectiveOrigins()).toEqual([
      'http://example.com',
      'http://foo.test',
    ]);
  });

  test('resolveDatabasePath prefers process.env.DB_PATH when no override', async () => {
    process.env.DB_PATH = '/tmp/env-db-path-test.sqlite';

    const { resolveDatabasePath } = await loadEnvModule();
    expect(resolveDatabasePath()).toBe('/tmp/env-db-path-test.sqlite');
  });

  test('resolveDatabasePath ignores Docker DB path in non-production runs', async () => {
    process.env.DB_PATH = '/app/server/data/myweb.db';

    const { appEnv, resolveDatabasePath } = await loadEnvModule();
    expect(appEnv.nodeEnv).not.toBe('production');
    expect(resolveDatabasePath()).toBe(appEnv.database.defaultFile);
  });

  test('applyDatabasePathOverride ignores empty override', async () => {
    delete process.env.DB_PATH;

    const { applyDatabasePathOverride } = await loadEnvModule();
    applyDatabasePathOverride('');

    expect(process.env.DB_PATH).toBeUndefined();
  });

  test('isCorsOriginAllowed returns true for empty origin', async () => {
    const { isCorsOriginAllowed } = await loadEnvModule();
    expect(isCorsOriginAllowed('')).toBe(true);
    expect(isCorsOriginAllowed(null)).toBe(true);
  });

  test('respects LOG_FILE override in log config', async () => {
    process.env.LOG_FILE = '/tmp/myweb-custom.log';

    const { appEnv } = await loadEnvModule();
    expect(appEnv.log.file).toBe('/tmp/myweb-custom.log');
  });
});
