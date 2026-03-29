import { jest } from '@jest/globals';
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

  test('reads admin token mapping via helper', async () => {
    process.env.FILES_ADMIN_TOKEN = 'plain-token';
    process.env.FILES_ADMIN_TOKEN_HASH = 'hashed-token';

    const { getAdminTokenConfig } = await loadEnvModule();
    const config = getAdminTokenConfig('FILES_ADMIN_TOKEN');

    expect(config).toEqual({ token: 'plain-token', tokenHash: 'hashed-token' });
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
